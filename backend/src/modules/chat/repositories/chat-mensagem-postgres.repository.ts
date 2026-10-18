import { Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { BaseRepository } from '../../../core/base/base.repository';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  BaldeConversa,
  ConsultaBusca,
  ConsultaConversa,
  ConsultaConversas,
  ConsultaTitulos,
  LIMITE_BUSCA,
  LIMITE_CONVERSA,
  LIMITE_CONVERSAS,
} from '../domain/chat-consultas';
import { ChatMensagemFonte, ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from './armazenamento-de-chat';

/** A linha de `chat_mensagem` com os mesmos nomes do documento do índice (só a data vem como `Date` do driver). */
type LinhaDeMensagem = Omit<ChatMensagemFonte, 'created_date'> & { created_date: Date };

interface LinhaDeConversa {
  chave: string;
  total: number;
  ultima: Date;
  primeira_texto: string;
}

interface LinhaDeTitulo {
  conversa_id: string;
  titulo: string;
}

const COLUNAS_DA_MENSAGEM = `mensagem_id, conversa_id, usuario_id, contexto, autor, texto, nivel, modelo, tokens_entrada, tokens_saida,
  tokens_cache, proposta_id, execucao_id, atividade_id, demanda_id, conteudo_bruto, created_date`;

function deLinha(linha: LinhaDeMensagem): ChatMensagemLida {
  return deFonte({ ...linha, created_date: linha.created_date.toISOString() });
}

/**
 * PROVISÓRIO (task 162): as mensagens do chat em tabelas do Postgres (`chat_mensagem`, `chat_conversa`), para o ambiente de teste
 * (`CHAT_ARMAZENAMENTO=postgres`) rodar sem o custo de um serviço de busca. Na produção de verdade o histórico fica no
 * Elasticsearch: este arquivo, o ramo `postgres` do provider e as duas tabelas saem juntos (ver `docs/SCHEMA.md`, "Tabelas provisórias").
 * Mensagens são gravadas uma vez e nunca reescritas (não há método de exclusão nem de alteração).
 */
export class ChatMensagemPostgresRepository extends BaseRepository<ChatMensagemFonte> implements ArmazenamentoDeChat {
  private readonly logger = new Logger(ChatMensagemPostgresRepository.name);

  constructor(conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'chat_mensagem');
  }

  async gravar(mensagem: ChatMensagemNova): Promise<ChatMensagemLida> {
    return this.proteger(async () => {
      const fonte = paraFonte(mensagem, randomUUID(), new Date());
      await this.executarConsulta(
        `INSERT INTO chat_mensagem (created_date, updated_date, is_deleted, mensagem_id, conversa_id, usuario_id, contexto, autor, texto,
                                    nivel, modelo, tokens_entrada, tokens_saida, tokens_cache, proposta_id, execucao_id, atividade_id,
                                    demanda_id, conteudo_bruto)
         SELECT :criadaEm, :criadaEm, false, CAST(:mensagemId AS uuid), :conversaId, :usuarioId, :contexto, :autor, :texto,
                :nivel, :modelo, :tokensEntrada, :tokensSaida, :tokensCache, :propostaId, :execucaoId, :atividadeId,
                :demandaId, CAST(:conteudoBruto AS jsonb)
         RETURNING id`,
        {
          criadaEm: fonte.created_date,
          mensagemId: fonte.mensagem_id,
          conversaId: fonte.conversa_id,
          usuarioId: fonte.usuario_id,
          contexto: fonte.contexto,
          autor: fonte.autor,
          texto: fonte.texto,
          nivel: fonte.nivel,
          modelo: fonte.modelo,
          tokensEntrada: fonte.tokens_entrada,
          tokensSaida: fonte.tokens_saida,
          tokensCache: fonte.tokens_cache,
          propostaId: fonte.proposta_id,
          execucaoId: fonte.execucao_id,
          atividadeId: fonte.atividade_id,
          demandaId: fonte.demanda_id,
          conteudoBruto: JSON.stringify(fonte.conteudo_bruto),
        },
      );
      return deFonte(fonte);
    });
  }

  async listarConversa(consulta: ConsultaConversa): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeMensagem>(
        `SELECT ${COLUNAS_DA_MENSAGEM}
         FROM chat_mensagem
         WHERE conversa_id = :conversaId AND usuario_id = :usuarioId AND is_deleted = false
         ORDER BY created_date ASC, id ASC
         LIMIT :limite`,
        { conversaId: consulta.conversaId, usuarioId: consulta.usuarioId, limite: LIMITE_CONVERSA },
      );
      return linhas.map(deLinha);
    });
  }

  async listarConversas(consulta: ConsultaConversas): Promise<BaldeConversa[]> {
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeConversa>(
        `SELECT conversa_id AS chave,
                CAST(COUNT(*) AS integer) AS total,
                MAX(created_date) AS ultima,
                (ARRAY_AGG(texto ORDER BY created_date ASC, id ASC))[1] AS primeira_texto
         FROM chat_mensagem
         WHERE usuario_id = :usuarioId AND contexto = 'CHAT' AND is_deleted = false
         GROUP BY conversa_id
         ORDER BY conversa_id DESC
         LIMIT :limite`,
        { usuarioId: consulta.usuarioId, limite: LIMITE_CONVERSAS },
      );
      return linhas.map((linha) => ({
        key: linha.chave,
        doc_count: linha.total,
        ultima: { value: linha.ultima.getTime() },
        primeira: { hits: { hits: [{ _source: { texto: linha.primeira_texto } }] } },
      }));
    });
  }

  async gravarTitulo(conversaId: string, usuarioId: number, titulo: string): Promise<void> {
    await this.proteger(async () => {
      await this.executarConsulta(
        `INSERT INTO chat_conversa (created_date, updated_date, is_deleted, conversa_id, usuario_id, titulo)
         SELECT NOW(), NOW(), false, :conversaId, :usuarioId, :titulo
         ON CONFLICT (conversa_id) DO UPDATE SET titulo = EXCLUDED.titulo, usuario_id = EXCLUDED.usuario_id, updated_date = NOW()
         RETURNING id`,
        { conversaId, usuarioId, titulo },
      );
    });
  }

  async listarTitulos(consulta: ConsultaTitulos): Promise<Record<string, string>> {
    if (consulta.conversaIds.length === 0) return {};
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeTitulo>(
        `SELECT conversa_id, titulo
         FROM chat_conversa
         WHERE usuario_id = :usuarioId AND conversa_id = ANY(CAST(:conversaIds AS text[])) AND is_deleted = false
         LIMIT :limite`,
        { usuarioId: consulta.usuarioId, conversaIds: consulta.conversaIds, limite: LIMITE_CONVERSAS },
      );
      return Object.fromEntries(linhas.map((linha) => [linha.conversa_id, linha.titulo ?? '']));
    });
  }

  /** Mesmo comportamento do OpenSearch: sem acento (`descricao` acha `descrição`), todas as palavras, relevância e depois a mais recente. */
  async buscar(consulta: ConsultaBusca): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeMensagem>(
        `SELECT ${COLUNAS_DA_MENSAGEM}
         FROM chat_mensagem
         WHERE usuario_id = :usuarioId AND is_deleted = false
           AND fn_chat_texto_busca(texto) @@ plainto_tsquery('portuguese', unaccent('unaccent', :texto))
           AND (CAST(:inicio AS timestamptz) IS NULL OR created_date >= CAST(:inicio AS timestamptz))
           AND (CAST(:fim AS timestamptz) IS NULL OR created_date <= CAST(:fim AS timestamptz))
         ORDER BY ts_rank(fn_chat_texto_busca(texto), plainto_tsquery('portuguese', unaccent('unaccent', :texto))) DESC, created_date DESC
         LIMIT :limite`,
        {
          usuarioId: consulta.usuarioId,
          texto: consulta.texto,
          inicio: consulta.inicio?.toISOString() ?? null,
          fim: consulta.fim?.toISOString() ?? null,
          limite: LIMITE_BUSCA,
        },
      );
      return linhas.map(deLinha);
    });
  }

  private async proteger<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (erro instanceof BusinessException) throw erro;
      this.logger.error(`Falha no Postgres do chat: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new BusinessException('O chat está indisponível no momento (armazenamento das mensagens fora do ar). Tente de novo em instantes.');
    }
  }
}
