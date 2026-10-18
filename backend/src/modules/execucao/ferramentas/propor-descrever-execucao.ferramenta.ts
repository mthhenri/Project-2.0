import { Injectable } from '@nestjs/common';
import { NivelIaEnum, ProporDescreverExecucaoDto, PropostaDescreverExecucaoDadosDto, TipoPropostaIaEnum, TipoPromptEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { recuperarExecucaoAtivaDetalhada } from '../domain/execucao-ativa-detalhada';
import { limparDescricaoRedigida, montarInstrucoesDeRedacao, SEM_TRABALHO } from '../domain/redacao-da-descricao';
import { ExecucaoService } from '../services/execucao.service';

/** Teto de tokens da redação da descrição. */
export const MAXIMO_TOKENS_DA_REDACAO = 600;

/**
 * Propõe a descrição formal da execução em andamento a partir do relato do desenvolvedor (o check-in); **não grava nada** (só o clique de
 * Confirmar encerra a execução com ela). A redação é uma chamada à parte, no **nível padrão**, com o prompt `DESCRICAO_EXECUCAO` mais as
 * instruções de rigor; a narrativa crua não vai para a execução. Falhar aqui (sem trabalho no relato, IA fora do ar) volta ao modelo como
 * erro e nenhum cartão nasce.
 */
@Injectable()
export class ProporDescreverExecucaoFerramenta extends FerramentaPropostaIa<ProporDescreverExecucaoDto> {
  readonly nome = 'propor_descrever_execucao';
  readonly descricao =
    'Propõe a descrição formal da execução em andamento a partir do relato do desenvolvedor no check-in, e o que fazer depois: CONTINUAR na mesma atividade ' +
    '(padrão) ou TROCAR para outra (informe atividadeSeguinteId, de listar_minhas_atividades). Passe em relato o que ele contou, fiel, com as palavras dele e sem ' +
    'inventar nada; o sistema redige a descrição formal. Só chame quando já tiver o essencial do que foi feito (e, se a execução passou da duração recomendada, depois ' +
    'de pedir mais detalhe). Almoço e pausa pessoal não são trabalho: não proponha descrição para eles. Nada é gravado até o usuário confirmar.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporDescreverExecucaoDto;
  readonly tipoProposta = TipoPropostaIaEnum.DESCREVER_EXECUCAO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly execucaoService: ExecucaoService,
    private readonly atividadeService: AtividadeService,
    private readonly iaService: IaService,
    private readonly promptService: PromptService,
    private readonly configuracaoIaService: ConfiguracaoIaService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporDescreverExecucaoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const ativa = await recuperarExecucaoAtivaDetalhada(this.execucaoService, usuarioAtivo);
    if (!ativa) throw new BusinessException('O usuário não tem execução em andamento: não há o que descrever');

    const escolha = entrada.escolha ?? 'CONTINUAR';
    let atividadeSeguinteNome: string | undefined;
    if (escolha === 'TROCAR') {
      if (!entrada.atividadeSeguinteId) throw new BusinessException('Informe atividadeSeguinteId para trocar de atividade');
      if (entrada.atividadeSeguinteId === ativa.atividadeId) throw new BusinessException('A atividade seguinte é a mesma da execução: use CONTINUAR');
      // `recuperar` confere a existência e o acesso do usuário à atividade.
      atividadeSeguinteNome = (await this.atividadeService.recuperar({ id: entrada.atividadeSeguinteId }, usuarioAtivo)).dados?.nome;
    }

    const minutos = Math.max(0, Math.round((this.agora().getTime() - ativa.inicioData.getTime()) / 60_000));
    const configuracao = await this.configuracaoIaService.obterAtiva();
    const prompt = await this.promptService.obterAtivo(TipoPromptEnum.DESCRICAO_EXECUCAO);
    const instrucoes = `${prompt.conteudo}\n\n${montarInstrucoesDeRedacao({
      atividade: ativa.nomeAtividade ?? '',
      demanda: ativa.nomeDemanda ?? '',
      minutos,
      duracaoRecomendadaMinutos: configuracao.duracaoRecomendadaMinutos,
      rigorProporcional: configuracao.rigorProporcional,
    })}`;
    const redigida = await this.iaService.gerar({
      nivel: NivelIaEnum.PADRAO,
      instrucoes,
      mensagens: [{ papel: 'usuario', conteudo: `Relato do desenvolvedor: ${entrada.relato}` }],
      maximoTokens: MAXIMO_TOKENS_DA_REDACAO,
    });

    if (redigida.texto.includes(SEM_TRABALHO)) throw new BusinessException('O relato não tem trabalho a descrever (só pausa, almoço ou conversa).');
    const descricao = limparDescricaoRedigida(redigida.texto);
    if (descricao.length < 3) throw new BusinessException('Não foi possível redigir a descrição a partir do relato; peça mais detalhe.');

    const dados: PropostaDescreverExecucaoDadosDto = {
      descricao,
      escolha,
      execucaoId: ativa.id,
      atividadeNome: ativa.nomeAtividade,
      demandaNome: ativa.nomeDemanda,
      minutos,
      ...(escolha === 'TROCAR' ? { atividadeSeguinteId: entrada.atividadeSeguinteId, atividadeSeguinteNome } : {}),
      ...(entrada.descricaoSeguinte?.trim() ? { descricaoSeguinte: entrada.descricaoSeguinte.trim() } : {}),
    };
    return { ...dados };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
