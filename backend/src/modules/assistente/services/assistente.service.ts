import { Injectable } from '@nestjs/common';
import {
  AssistenteDescricaoAuxiliadaDto,
  AssistenteDescricaoAuxiliarDto,
  AssistenteTrechoAlteradoDto,
  AssistenteTrechoAlterarDto,
  conferirEncaixeDoTrecho,
  NIVEL_DO_TIPO_DE_PROMPT,
  PlanoAbaEnum,
  TipoPromptEnum,
} from '@project20/shared';
import { NivelIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaService } from '../../demanda/services/demanda.service';
import { IaUsoService } from '../../ia-custo/services/ia-uso.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { traduzirFalhaDeIa } from '../../ia/domain/ia.exception';
import { IaService } from '../../ia/services/ia.service';
import { StandardResponse } from '../../../core/interfaces/standard-response.interface';

/** Teto de tokens da resposta (era `ANTHROPIC_MAXIMO_TOKENS`, que deixou de valer). */
const MAXIMO_TOKENS = 1024;
/** Teto de tokens do bloco devolvido ao alterar um trecho: o bloco inteiro volta, e ele pode ser longo. */
const MAXIMO_TOKENS_DO_TRECHO = 4096;

/** O prompt de como escrever cada tipo de texto da demanda (os mesmos do modo planejamento). */
const PROMPT_DA_ABA: Record<PlanoAbaEnum, TipoPromptEnum> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: TipoPromptEnum.PLANO_DESCRICAO_TECNICA,
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: TipoPromptEnum.PLANO_DESCRICAO_CLIENTE,
  [PlanoAbaEnum.DOCUMENTACAO]: TipoPromptEnum.PLANO_DOCUMENTACAO,
};

const MENSAGEM_NAO_ENCAIXA = 'A IA devolveu um texto que muda além da seleção. Peça de novo.';
const MENSAGEM_SEM_MUDANCA = 'A IA não mudou nada no trecho. Reescreva o pedido e tente de novo.';

@Injectable()
export class AssistenteService {
  constructor(
    private readonly iaService: IaService,
    private readonly demandaService: DemandaService,
    private readonly promptService: PromptService,
    private readonly iaUsoService: IaUsoService,
  ) {}

  /**
   * Refina, clarifica e complementa a descrição fornecida pelo usuário pela camada de IA (nível padrão).
   */
  async auxiliarDescricao(
    dto: AssistenteDescricaoAuxiliarDto,
  ): Promise<StandardResponse<AssistenteDescricaoAuxiliadaDto>> {
    const tipoEntidadeFormatado = {
      execucao: 'execução de trabalho',
      demanda: 'demanda de projeto',
    }[dto.tipoEntidade];

    const prompt = `Você é um assistente que ajuda desenvolvedores a escrever descrições técnicas mais claras e completas.

Contexto: o usuário está descrevendo uma ${tipoEntidadeFormatado} chamada "${dto.contextoEntidade}".

Texto original do usuário:
${dto.textoOriginal}

Refine, clarifique e complemente esse texto mantendo a voz e intenção original do usuário. Corrija erros gramaticais, melhore a clareza técnica e adicione detalhes relevantes quando faltarem. Responda apenas com o texto refinado, sem explicações adicionais.`;

    try {
      const resposta = await this.iaService.gerar({
        nivel: NivelIaEnum.PADRAO,
        mensagens: [{ papel: 'usuario', conteudo: prompt }],
        maximoTokens: MAXIMO_TOKENS,
      });
      const textoAuxiliado = resposta.texto;

      return {
        sucesso: true,
        dados: { textoOriginal: dto.textoOriginal, textoAuxiliado },
        mensagem: 'Descrição auxiliada com sucesso',
      };
    } catch (erro) {
      throw traduzirFalhaDeIa(erro);
    }
  }

  /**
   * Altera só a seleção de um bloco de texto da demanda a pedido de quem escreve (task 260, tela de Documentações), sem conversa e sem gravar nada:
   * devolve o bloco com a seleção alterada para a pessoa aceitar ou descartar. Permissão de §14: quem pode editar aquela aba da demanda. A resposta
   * que muda além da seleção, ou que não muda nada, é recusada em vez de proposta.
   */
  async alterarTrecho(
    dto: AssistenteTrechoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AssistenteTrechoAlteradoDto>> {
    await this.demandaService.recuperarDemandaParaEditar(dto.demandaId, dto.aba === PlanoAbaEnum.DESCRICAO_CLIENTE, usuarioAtivo);

    const [promptDoTrecho, promptDaAba] = await Promise.all([
      this.promptService.obterAtivo(TipoPromptEnum.ALTERAR_TRECHO),
      this.promptService.obterAtivo(PROMPT_DA_ABA[dto.aba]),
    ]);
    const instrucoes = `${promptDoTrecho.conteudo}\n\nComo escrever este tipo de texto:\n${promptDaAba.conteudo}`;
    const pedido = [
      'BLOCO:',
      dto.bloco,
      '',
      'SELEÇÃO (o único alvo da mudança):',
      dto.selecao,
      '',
      `PEDIDO: ${dto.pedido}`,
    ].join('\n');

    let blocoNovo: string;
    let modelo: string;
    let tokens: { entrada: number; saida: number; cache: number };
    try {
      const resposta = await this.iaService.gerar({
        nivel: NIVEL_DO_TIPO_DE_PROMPT[TipoPromptEnum.ALTERAR_TRECHO],
        instrucoes,
        mensagens: [{ papel: 'usuario', conteudo: pedido }],
        maximoTokens: MAXIMO_TOKENS_DO_TRECHO,
      });
      blocoNovo = resposta.texto.trim();
      modelo = resposta.modelo;
      tokens = resposta.tokens;
    } catch (erro) {
      throw traduzirFalhaDeIa(erro);
    }

    // A IA respondeu e gastou tokens, encaixe ou não: a chamada entra na conta da aba Custos (task 260).
    await this.iaUsoService.registrar({
      usuarioId:     usuarioAtivo.sub,
      descricao:     'Alterar trecho (Documentações)',
      nivel:         NIVEL_DO_TIPO_DE_PROMPT[TipoPromptEnum.ALTERAR_TRECHO],
      modelo,
      tokensEntrada: tokens.entrada,
      tokensSaida:   tokens.saida,
      tokensCache:   tokens.cache,
      demandaId:     dto.demandaId,
    });

    const encaixe = conferirEncaixeDoTrecho(dto.bloco, dto.selecao, blocoNovo);
    if (encaixe.encaixa === false) throw new BusinessException(encaixe.motivo === 'IGUAL' ? MENSAGEM_SEM_MUDANCA : MENSAGEM_NAO_ENCAIXA);

    return {
      sucesso: true,
      dados: { bloco: dto.bloco, blocoNovo },
      mensagem: 'Trecho alterado pela IA; nada foi gravado',
    };
  }
}
