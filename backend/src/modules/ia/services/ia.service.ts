import { Inject, Injectable } from '@nestjs/common';
import {
  ConfiguracaoIaResumoDto,
  EstadoIaEnum,
  IaEstadoRecuperadoDto,
  NivelIaEnum,
  StandardResponse,
  TipoProvedorIaEnum,
} from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaCustoService } from '../../ia-custo/services/ia-custo.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { turnoAtual } from '../domain/turno-ia';
import { IaResposta, IaRespostaProvedor, IaSolicitacao, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/** Provedores implementados, por tipo. Os que faltam (Google, OpenAI) falham com erro claro de configuração. */
export const IA_PROVEDORES = 'IA_PROVEDORES';
export type IaProvedores = Partial<Record<TipoProvedorIaEnum, IaProvedor>>;

const MAXIMO_TOKENS_PADRAO = 1024;

/**
 * Camada única de acesso à IA (task 130): ninguém fora deste módulo fala com o SDK de um provedor. Quem chama informa o
 * **nível** (rápido, padrão, analítico); o modelo e o esforço vêm da configuração ativa a cada chamada.
 */
@Injectable()
export class IaService {
  /** Resultado da última chamada. Saúde em tempo real, só em memória. */
  private ultimoResultado: EstadoIaEnum.NO_AR | EstadoIaEnum.FORA_DO_AR = EstadoIaEnum.NO_AR;

  constructor(
    private readonly configuracaoIaService: ConfiguracaoIaService,
    private readonly iaCustoService: IaCustoService,
    @Inject(IA_PROVEDORES) private readonly provedores: IaProvedores,
  ) {}

  async gerar(solicitacao: IaSolicitacao): Promise<IaResposta> {
    const { provedor, solicitacaoProvedor, deteccaoAutomatica } = await this.preparar(solicitacao);
    return this.executar(solicitacao, solicitacaoProvedor.modelo, deteccaoAutomatica, () => provedor.gerar(solicitacaoProvedor));
  }

  async transmitir(solicitacao: IaSolicitacao, aoTrecho: (trecho: string) => void): Promise<IaResposta> {
    const { provedor, solicitacaoProvedor, deteccaoAutomatica } = await this.preparar(solicitacao);
    return this.executar(solicitacao, solicitacaoProvedor.modelo, deteccaoAutomatica, () => provedor.transmitir(solicitacaoProvedor, aoTrecho));
  }

  /**
   * `DESLIGADA` se o administrador desligou; senão, `FORA_DO_AR` sem chave ou, **com a detecção automática ligada**, depois de uma falha do
   * provedor (a primeira chamada bem-sucedida recupera); `NO_AR` caso contrário. Com a detecção desligada, só o desligamento manual
   * troca as telas: falhas do provedor não derrubam o estado.
   */
  async obterEstado(): Promise<EstadoIaEnum> {
    const configuracao = await this.configuracaoIaService.obterAtiva();
    if (configuracao.iaDesligada) return EstadoIaEnum.DESLIGADA;
    const provedor = this.provedores[configuracao.provedor];
    if (!provedor || !provedor.estaDisponivel()) return EstadoIaEnum.FORA_DO_AR;
    return configuracao.deteccaoAutomatica ? this.ultimoResultado : EstadoIaEnum.NO_AR;
  }

  /** Para a rota de leitura do estado (administrador). */
  async recuperarEstado(): Promise<StandardResponse<IaEstadoRecuperadoDto>> {
    return { sucesso: true, dados: { estado: await this.obterEstado() }, mensagem: 'Estado da IA recuperado com sucesso' };
  }

  /** Lê a configuração, recusa se a IA está desligada (antes de qualquer requisição externa) e resolve nível → modelo. */
  private async preparar(solicitacao: IaSolicitacao): Promise<{ provedor: IaProvedor; solicitacaoProvedor: IaSolicitacaoProvedor; deteccaoAutomatica: boolean }> {
    const configuracao = await this.configuracaoIaService.obterAtiva();
    if (configuracao.iaDesligada) throw new IaException('DESLIGADA', 'A IA está desligada');

    const provedor = this.provedores[configuracao.provedor];
    if (!provedor) throw new IaException('CONFIGURACAO', `O provedor ${configuracao.provedor} ainda não tem suporte`);

    const { nivel, maximoTokens, ...resto } = solicitacao;
    return {
      provedor,
      deteccaoAutomatica: configuracao.deteccaoAutomatica,
      solicitacaoProvedor: {
        ...resto,
        modelo: this.modeloDoNivel(nivel, configuracao),
        esforco: nivel === NivelIaEnum.ANALITICO ? configuracao.esforcoAnalitico : undefined,
        maximoTokens: maximoTokens ?? MAXIMO_TOKENS_PADRAO,
      },
    };
  }

  private modeloDoNivel(nivel: NivelIaEnum, configuracao: ConfiguracaoIaResumoDto): string {
    switch (nivel) {
      case NivelIaEnum.RAPIDO:
        return configuracao.modeloRapido;
      case NivelIaEnum.PADRAO:
        return configuracao.modeloPadrao;
      case NivelIaEnum.ANALITICO:
        return configuracao.modeloAnalitico;
    }
  }

  private async executar(solicitacao: IaSolicitacao, modeloSolicitado: string, deteccaoAutomatica: boolean, chamada: () => Promise<IaRespostaProvedor>): Promise<IaResposta> {
    try {
      const resposta = await chamada();
      this.ultimoResultado = EstadoIaEnum.NO_AR;
      const respondida = { ...resposta, nivel: solicitacao.nivel };
      // O ponto único da coleta do turno do chat (task 188): só chamada bem-sucedida entra, e fora de um turno nada muda.
      turnoAtual()?.registrar(respondida);
      // O mesmo ponto único alimenta o custo (task 201): toda chamada bem-sucedida, de qualquer origem, entra em `ia_uso`.
      await this.iaCustoService.registrarUso({
        // O modelo da configuração (o que o administrador precifica), e não o id datado que o provedor pode devolver para um alias.
        modelo: modeloSolicitado,
        tokensEntrada: respondida.tokens.entrada,
        tokensSaida: respondida.tokens.saida,
        tokensCache: respondida.tokens.cache,
      });
      return respondida;
    } catch (erro) {
      if (deteccaoAutomatica && erro instanceof IaException && erro.motivo === 'INDISPONIVEL') this.ultimoResultado = EstadoIaEnum.FORA_DO_AR;
      throw erro;
    }
  }
}
