import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  cadeiaDeProvedoresIa,
  ConfiguracaoIaModelosDto,
  ConfiguracaoIaResumoDto,
  EstadoIaEnum,
  IaEstadoRecuperadoDto,
  NivelIaEnum,
  StandardResponse,
  TipoProvedorIaEnum,
} from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { turnoAtual } from '../domain/turno-ia';
import { IaResposta, IaRespostaProvedor, IaSolicitacao, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/** Provedores implementados, por tipo. Um tipo ausente é tratado como indisponível: a cadeia o pula. */
export const IA_PROVEDORES = 'IA_PROVEDORES';
export type IaProvedores = Partial<Record<TipoProvedorIaEnum, IaProvedor>>;

const MAXIMO_TOKENS_PADRAO = 1024;

/** Um provedor da cadeia (o padrão e depois cada fallback) com os modelos dele para os três níveis. */
interface PassoDaCadeia extends ConfiguracaoIaModelosDto {
  tipo: TipoProvedorIaEnum;
}

/**
 * Camada única de acesso à IA (task 130): ninguém fora deste módulo fala com o SDK de um provedor. Quem chama informa o
 * **nível** (rápido, padrão, analítico); o modelo e o esforço vêm da configuração ativa a cada chamada. A configuração traz
 * uma **cadeia de provedores** (principal, depois os fallbacks, task 203): se um falha, a mesma chamada segue para o próximo,
 * com os modelos dele.
 */
@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  /** Resultado da última chamada. Saúde em tempo real, só em memória. */
  private ultimoResultado: EstadoIaEnum.NO_AR | EstadoIaEnum.FORA_DO_AR = EstadoIaEnum.NO_AR;

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
   * `DESLIGADA` se o administrador desligou; senão, `FORA_DO_AR` sem chave em **nenhum** provedor da cadeia ou, **com a detecção
   * automática ligada**, depois de a cadeia inteira falhar (a primeira chamada bem-sucedida recupera); `NO_AR` caso contrário. Com a
   * detecção desligada, só o desligamento manual troca as telas: falhas do provedor não derrubam o estado.
   */
  async obterEstado(): Promise<EstadoIaEnum> {
    const configuracao = await this.configuracaoIaService.obterAtiva();
    if (configuracao.iaDesligada) return EstadoIaEnum.DESLIGADA;
    if (!this.montarCadeia(configuracao).some((passo) => this.provedores[passo.tipo]?.estaDisponivel())) return EstadoIaEnum.FORA_DO_AR;
    return configuracao.deteccaoAutomatica ? this.ultimoResultado : EstadoIaEnum.NO_AR;
  }

  /** Para a rota de leitura do estado (administrador). */
  async recuperarEstado(): Promise<StandardResponse<IaEstadoRecuperadoDto>> {
    return { sucesso: true, dados: { estado: await this.obterEstado() }, mensagem: 'Estado da IA recuperado com sucesso' };
  }

  /** O padrão e depois cada fallback, na ordem da configuração, com os modelos de cada um (um provedor sem modelos na cadeia é pulado). */
  private montarCadeia(configuracao: ConfiguracaoIaResumoDto): PassoDaCadeia[] {
    return cadeiaDeProvedoresIa(configuracao).flatMap((tipo) => {
      const modelos = configuracao.modelosProvedor[tipo];
      return modelos ? [{ tipo, ...modelos }] : [];
    });
  }

  /**
   * Lê a configuração, recusa se a IA está desligada (antes de qualquer requisição externa) e percorre a cadeia: provedor sem chave é
   * pulado; falha do provedor passa ao próximo. Se todos falham, devolve a falha do **primeiro provedor chamado** (o padrão, quando ele tem chave).
   */
  private async executar(
    solicitacao: IaSolicitacao,
    chamar: (provedor: IaProvedor, solicitacaoProvedor: IaSolicitacaoProvedor) => Promise<IaRespostaProvedor>,
    jaEmitiuAoUsuario: () => boolean = () => false,
  ): Promise<IaResposta> {
    const configuracao = await this.configuracaoIaService.obterAtiva();
    if (configuracao.iaDesligada) throw new IaException('DESLIGADA', 'A IA está desligada');

    const falhas: IaException[] = [];
    for (const passo of this.montarCadeia(configuracao)) {
      const provedor = this.provedores[passo.tipo];
      if (!provedor || !provedor.estaDisponivel()) continue;
      try {
        const resposta = await chamar(provedor, this.montarSolicitacaoDoProvedor(solicitacao, passo, configuracao));
        this.ultimoResultado = EstadoIaEnum.NO_AR;
        if (falhas.length > 0) this.logger.warn(`Provedor ${passo.tipo} respondeu depois de ${falhas.length} falha(s) na cadeia da IA`);
        const respondida = { ...resposta, nivel: solicitacao.nivel };
        // O ponto único da coleta do turno do chat (task 188): só chamada bem-sucedida entra, e fora de um turno nada muda.
        turnoAtual()?.registrar(respondida);
        return respondida;
      } catch (erro) {
        const falha = erro instanceof IaException ? erro : new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');
        falhas.push(falha);
        this.logger.warn(`Provedor ${passo.tipo} falhou (${falha.motivo})`);
        if (jaEmitiuAoUsuario()) break;
      }
    }

    // Provedor pulado por falta de chave não é falha: vale a do primeiro que foi de fato chamado; sem nenhum chamado, a IA está indisponível.
    const falhaDevolvida = falhas[0] ?? new IaException('INDISPONIVEL', 'IA indisponível neste ambiente');
    if (configuracao.deteccaoAutomatica && falhaDevolvida.motivo === 'INDISPONIVEL') this.ultimoResultado = EstadoIaEnum.FORA_DO_AR;
    throw falhaDevolvida;
  }

  /** Resolve nível → modelo do provedor do passo (o esforço só vale no analítico). */
  private montarSolicitacaoDoProvedor(solicitacao: IaSolicitacao, passo: PassoDaCadeia, configuracao: ConfiguracaoIaResumoDto): IaSolicitacaoProvedor {
    const { nivel, maximoTokens, ...resto } = solicitacao;
    return {
      ...resto,
      modelo: this.modeloDoNivel(nivel, passo),
      esforco: nivel === NivelIaEnum.ANALITICO ? configuracao.esforcoAnalitico : undefined,
      maximoTokens: maximoTokens ?? MAXIMO_TOKENS_PADRAO,
    };
  }

  private modeloDoNivel(nivel: NivelIaEnum, passo: PassoDaCadeia): string {
    switch (nivel) {
      case NivelIaEnum.RAPIDO:
        return passo.modeloRapido;
      case NivelIaEnum.PADRAO:
        return passo.modeloPadrao;
      case NivelIaEnum.ANALITICO:
        return passo.modeloAnalitico;
    }
  }
}
