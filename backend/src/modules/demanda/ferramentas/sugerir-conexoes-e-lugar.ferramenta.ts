import { Injectable } from '@nestjs/common';
import { DemandaDoGrafoDto, NivelIaEnum, SugerirConexoesELugarDto, SugestoesDeConexaoELugarDto, TipoPromptEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { IaService } from '../../ia/services/ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PromptService } from '../../prompt/services/prompt.service';
import {
  MAXIMO_DE_DEMANDAS_NO_CONTEXTO,
  filtrarSugestoes,
  interpretarSugestoesDeConexao,
  montarContextoDaAnalise,
  montarInstrucoesDaAnalise,
} from '../domain/sugestoes-de-conexao';
import { DemandaService } from '../services/demanda.service';

/** Teto de tokens da análise. */
export const MAXIMO_TOKENS_DA_ANALISE = 1500;

/**
 * Analisa uma demanda com o contexto do projeto e devolve **sugestões** de conexão ou de lugar na árvore (task 156). É leitura: não propõe
 * nem grava nada; a IA apresenta as sugestões ao gestor e só chama `propor_conectar_demanda` com a que ele aceitar. A análise é uma
 * chamada à parte no **nível analítico**, com o prompt `CONEXAO_DEMANDA` ativo; o que o modelo devolve é validado contra o grafo real
 * (ids do projeto, conexão que já existe, estrutura de destino, ciclos de hierarquia). Só o gestor.
 */
@Injectable()
export class SugerirConexoesELugarFerramenta extends FerramentaIa<SugerirConexoesELugarDto> {
  readonly nome = 'sugerir_conexoes_e_lugar';
  readonly descricao =
    'Analisa uma demanda com o contexto do projeto (as outras demandas, as descrições e as conexões) e devolve sugestões fundamentadas de conexão com outra demanda ou de lugar melhor na árvore, ' +
    'cada uma com o motivo. Não propõe nem grava nada: apresente as sugestões ao gestor, pergunte qual aceita e só então chame propor_conectar_demanda. Pode devolver nenhuma sugestão.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = SugerirConexoesELugarDto;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly projetoService: ProjetoService,
    private readonly iaService: IaService,
    private readonly promptService: PromptService,
  ) {
    super();
  }

  async executar(entrada: SugerirConexoesELugarDto, usuarioAtivo: JwtPayload): Promise<SugestoesDeConexaoELugarDto> {
    const alvo = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!alvo) throw new BusinessException('Demanda não encontrada');
    const projeto = (await this.projetoService.recuperar({ id: alvo.projetoId }, usuarioAtivo)).dados;
    const grafo = (await this.demandaService.recuperarGrafo({ projetoId: alvo.projetoId }, usuarioAtivo)).dados;
    const nos = grafo?.nos ?? [];
    const demandas: DemandaDoGrafoDto[] = nos.map((no) => ({
      id: no.id,
      nome: no.nome,
      status: no.status,
      isEstrutural: no.isEstrutural,
      paiId: no.demandaPaiId,
      horasEstimadas: no.horasEstimadas,
      horasExecutadas: Math.round((no.minutosExecutados / 60) * 10) / 10,
      temDescricaoTecnica: no.temDescricaoTecnica,
      temDescricaoCliente: no.temDescricaoCliente,
      tags: no.tags.map((tag) => tag.nome),
    }));
    const conexoes = (grafo?.arestas ?? []).filter((aresta) => aresta.tipo === 'conexao').map((aresta) => ({ origemId: aresta.origemId, destinoId: aresta.destinoId }));
    const outras = demandas.filter((demanda) => demanda.id !== entrada.demandaId);
    // Sem outra demanda no projeto não há com o que ligar nem onde pôr: nem chama o modelo (nível analítico é o mais caro).
    if (outras.length === 0) return { demandaId: entrada.demandaId, sugestoes: [], semSugestoes: true };

    const paraContexto = [];
    for (const demanda of outras.slice(0, MAXIMO_DE_DEMANDAS_NO_CONTEXTO)) {
      const completa = (await this.demandaService.recuperar({ id: demanda.id }, usuarioAtivo)).dados;
      paraContexto.push({ id: demanda.id, nome: demanda.nome, paiId: demanda.paiId, isEstrutural: demanda.isEstrutural, status: demanda.status, descricao: completa?.descricaoCliente || completa?.descricaoTecnica || null });
    }
    const contexto = montarContextoDaAnalise({
      projeto: projeto?.nome ?? '',
      alvo: { id: alvo.id, nome: alvo.nome, paiId: alvo.demandaPaiId, isEstrutural: alvo.isEstrutural, status: alvo.status, descricao: null, descricaoCliente: alvo.descricaoCliente, descricaoTecnica: alvo.descricaoTecnica },
      outras: paraContexto,
      conexoesDoAlvo: conexoes.filter((conexao) => conexao.origemId === alvo.id || conexao.destinoId === alvo.id),
    });
    const prompt = await this.promptService.obterAtivo(TipoPromptEnum.CONEXAO_DEMANDA);
    const resposta = await this.iaService.gerar({
      nivel: NivelIaEnum.ANALITICO,
      instrucoes: `${prompt.conteudo}\n\n${montarInstrucoesDaAnalise()}`,
      mensagens: [{ papel: 'usuario', conteudo: contexto }],
      maximoTokens: MAXIMO_TOKENS_DA_ANALISE,
    });
    const sugestoes = filtrarSugestoes({ brutas: interpretarSugestoesDeConexao(resposta.texto), demandaId: entrada.demandaId, demandas, conexoesExistentes: conexoes });
    return { demandaId: entrada.demandaId, sugestoes, semSugestoes: sugestoes.length === 0 };
  }
}
