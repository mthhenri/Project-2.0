import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    cadeiaDoNivelIa,
    ConfiguracaoIaCadeiaItemDto,
    EstadoIaEnum,
    IaEstadoCompletoRecuperadoDto,
    IaEstadoRecuperadoDto,
    NivelIaEnum,
    rotuloDoNivelIa,
    StandardResponse,
    TipoProvedorIaEnum,
} from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { descartarAssinaturas } from '../domain/ia-mensagens';
import { turnoAtual } from '../domain/turno-ia';
import { IaResposta, IaRespostaProvedor, IaSolicitacao, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/** Provedores implementados, por tipo. Um tipo ausente é tratado como indisponível: a cadeia o pula. */
export const IA_PROVEDORES = 'IA_PROVEDORES';
export type IaProvedores = Partial<Record<TipoProvedorIaEnum, IaProvedor>>;

const MAXIMO_TOKENS_PADRAO = 1024;

type ResultadoDoNivel = EstadoIaEnum.NO_AR | EstadoIaEnum.FORA_DO_AR;

/**
 * Camada única de acesso à IA (task 130): ninguém fora deste módulo fala com o SDK de um provedor. Quem chama informa o
 * **nível** (rápido, padrão, analítico); o modelo, o provedor e o esforço vêm da configuração ativa a cada chamada. Cada nível tem a sua
 * **cadeia** de itens `{provedor, modelo, esforço}` (spec 261): o primeiro é o principal e os seguintes são a contingência. Se um item
 * falha, a mesma chamada segue para o próximo, com o modelo e o esforço dele.
 */
@Injectable()
export class IaService {
    private readonly logger = new Logger(IaService.name);

    /** Resultado da última chamada de cada nível. Saúde em tempo real, só em memória; todo nível nasce no ar. */
    private readonly ultimoResultadoPorNivel: Record<NivelIaEnum, ResultadoDoNivel> = {
        [NivelIaEnum.RAPIDO]: EstadoIaEnum.NO_AR,
        [NivelIaEnum.PADRAO]: EstadoIaEnum.NO_AR,
        [NivelIaEnum.ANALITICO]: EstadoIaEnum.NO_AR,
    };

    constructor(
        private readonly configuracaoIaService: ConfiguracaoIaService,
        @Inject(IA_PROVEDORES) private readonly provedores: IaProvedores,
    ) {}

    async gerar(solicitacao: IaSolicitacao): Promise<IaResposta> {
        return this.executar(solicitacao, (provedor, solicitacaoProvedor) => provedor.gerar(solicitacaoProvedor));
    }

    async transmitir(solicitacao: IaSolicitacao, aoTrecho: (trecho: string) => void): Promise<IaResposta> {
        // Depois que um trecho foi ao usuário, tentar outro provedor repetiria o começo da resposta: a falha segue sem fallback.
        let trechoEmitido = false;
        return this.executar(
            solicitacao,
            (provedor, solicitacaoProvedor) =>
                provedor.transmitir(solicitacaoProvedor, (trecho) => {
                    trechoEmitido = true;
                    aoTrecho(trecho);
                }),
            () => trechoEmitido,
        );
    }

    /**
     * `DESLIGADA` se o administrador desligou; senão, `FORA_DO_AR` sem chave em **nenhum** item de **nenhuma** cadeia ou, **com a detecção
     * automática ligada**, quando **todos** os níveis falharam na última chamada (a primeira chamada bem-sucedida de um nível o recupera);
     * `NO_AR` caso contrário. Um nível sem item utilizável não derruba o sistema: só as funcionalidades daquele nível falham. Com a
     * detecção desligada, só o desligamento manual troca as telas: falhas do provedor não derrubam o estado.
     */
    async obterEstado(): Promise<EstadoIaEnum> {
        const configuracao = await this.configuracaoIaService.obterAtiva();
        if (configuracao.iaDesligada) return EstadoIaEnum.DESLIGADA;
        const niveis = Object.values(NivelIaEnum);
        if (!niveis.some((nivel) => this.temItemUtilizavel(cadeiaDoNivelIa(configuracao, nivel)))) return EstadoIaEnum.FORA_DO_AR;
        if (!configuracao.deteccaoAutomatica) return EstadoIaEnum.NO_AR;
        return niveis.every((nivel) => this.ultimoResultadoPorNivel[nivel] === EstadoIaEnum.FORA_DO_AR) ? EstadoIaEnum.FORA_DO_AR : EstadoIaEnum.NO_AR;
    }

    /** Para a rota de leitura do estado (administrador). */
    async recuperarEstado(): Promise<StandardResponse<IaEstadoRecuperadoDto>> {
        return { sucesso: true, dados: { estado: await this.obterEstado() }, mensagem: 'Estado da IA recuperado com sucesso' };
    }

    /** Para a tela de configurações (administrador): o estado e quais provedores têm chave no ambiente, sem nunca expor a chave. */
    async recuperarEstadoCompleto(): Promise<StandardResponse<IaEstadoCompletoRecuperadoDto>> {
        const provedoresComChave = Object.values(TipoProvedorIaEnum).filter((tipo) => this.provedores[tipo]?.estaDisponivel());
        return { sucesso: true, dados: { estado: await this.obterEstado(), provedoresComChave }, mensagem: 'Estado da IA recuperado com sucesso' };
    }

    private temItemUtilizavel(cadeia: ConfiguracaoIaCadeiaItemDto[]): boolean {
        return cadeia.some((item) => this.provedores[item.provedor]?.estaDisponivel());
    }

    /**
     * Lê a configuração, recusa se a IA está desligada (antes de qualquer requisição externa) e percorre a cadeia do nível: item sem chave
     * é pulado; falha do provedor passa ao próximo item, com o mesmo histórico neutro (sem a assinatura do provedor anterior). Se todos
     * falham, devolve a falha do **primeiro item chamado** (o principal, quando ele tem chave); se nenhum item pôde ser chamado, a IA
     * está indisponível **para aquele nível**.
     */
    private async executar(
        solicitacao: IaSolicitacao,
        chamar: (provedor: IaProvedor, solicitacaoProvedor: IaSolicitacaoProvedor) => Promise<IaRespostaProvedor>,
        jaEmitiuAoUsuario: () => boolean = () => false,
    ): Promise<IaResposta> {
        const configuracao = await this.configuracaoIaService.obterAtiva();
        if (configuracao.iaDesligada) throw new IaException('DESLIGADA', 'A IA está desligada');

        const { nivel } = solicitacao;
        const cadeia = cadeiaDoNivelIa(configuracao, nivel);
        const falhas: IaException[] = [];
        for (const [posicao, item] of cadeia.entries()) {
            const provedor = this.provedores[item.provedor];
            if (!provedor || !provedor.estaDisponivel()) continue;
            try {
                const resposta = await chamar(provedor, this.montarSolicitacaoDoProvedor(solicitacao, item));
                this.ultimoResultadoPorNivel[nivel] = EstadoIaEnum.NO_AR;
                if (falhas.length > 0) this.logger.warn(`Provedor ${item.provedor} respondeu o nível ${nivel} depois de ${falhas.length} falha(s) na cadeia da IA`);
                // Item principal respondeu: o planejado é o próprio modelo que respondeu (o provedor devolve o nome com a data do lançamento).
                const modeloPlanejado = posicao === 0 ? resposta.modelo : cadeia[0].modelo;
                const respondida = { ...resposta, nivel, modeloPlanejado };
                // O ponto único da coleta do turno do chat (task 188): só chamada bem-sucedida entra, e fora de um turno nada muda.
                turnoAtual()?.registrar(respondida);
                return respondida;
            } catch (erro) {
                const falha = erro instanceof IaException ? erro : new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');
                falhas.push(falha);
                this.logger.warn(`Provedor ${item.provedor} falhou no nível ${nivel} (${falha.motivo})`);
                if (jaEmitiuAoUsuario()) break;
            }
        }

        // Item pulado por falta de chave não é falha: vale a do primeiro que foi de fato chamado; sem nenhum chamado, o nível está indisponível.
        const falhaDevolvida = falhas[0] ?? new IaException('INDISPONIVEL', `IA indisponível para o nível ${rotuloDoNivelIa(nivel)}: nenhum provedor da cadeia tem chave neste ambiente`);
        if (configuracao.deteccaoAutomatica && falhaDevolvida.motivo === 'INDISPONIVEL') this.ultimoResultadoPorNivel[nivel] = EstadoIaEnum.FORA_DO_AR;
        throw falhaDevolvida;
    }

    /** Resolve o item da cadeia em modelo e esforço do provedor; a assinatura opaca do Gemini só segue para o próprio Gemini. */
    private montarSolicitacaoDoProvedor(solicitacao: IaSolicitacao, item: ConfiguracaoIaCadeiaItemDto): IaSolicitacaoProvedor {
        const { nivel: _nivel, maximoTokens, mensagens, ...resto } = solicitacao;
        return {
            ...resto,
            mensagens: item.provedor === TipoProvedorIaEnum.GOOGLE ? mensagens : descartarAssinaturas(mensagens),
            modelo: item.modelo,
            esforco: item.esforco,
            maximoTokens: maximoTokens ?? MAXIMO_TOKENS_PADRAO,
        };
    }
}
