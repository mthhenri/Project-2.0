import { Knex } from 'knex';
import { ConfigService } from '../../../config/config.service';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { BaldeConversa, ConsultaBusca, ConsultaConversa, ConsultaConversas, ConsultaTitulos } from '../domain/chat-consultas';
import { ChatMensagemLida, ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { ChatMensagemElasticsearchRepository, criarClienteElasticsearchChat } from './chat-mensagem-elasticsearch.repository';
import { ChatMensagemOpenSearchRepository, criarClienteOpenSearchChat } from './chat-mensagem-opensearch.repository';
import { ChatMensagemPostgresRepository } from './chat-mensagem-postgres.repository';

/**
 * O contrato do armazenamento das mensagens do chat (task 162). O `ChatService` só conhece isto; a implementação vem de
 * `CHAT_ARMAZENAMENTO`: OpenSearch no desenvolvimento, tabelas provisórias do Postgres na produção de teste e, na produção de
 * verdade, Elasticsearch. Não há exclusão nem alteração de mensagem: elas são gravadas uma vez.
 */
export interface ArmazenamentoDeChat {
  gravar(mensagem: ChatMensagemNova): Promise<ChatMensagemLida>;
  /** A conversa do dia, em ordem crescente de data, só do dono. */
  listarConversa(consulta: ConsultaConversa): Promise<ChatMensagemLida[]>;
  /** As conversas do usuário (uma por dia, contexto CHAT), da mais recente à mais antiga, sem as mensagens. */
  listarConversas(consulta: ConsultaConversas): Promise<BaldeConversa[]>;
  /** Guarda (ou troca) o título da conversa. */
  gravarTitulo(conversaId: string, usuarioId: number, titulo: string): Promise<void>;
  /** Os títulos das conversas pedidas do usuário, por `conversaId`; quem não tem título não aparece. */
  listarTitulos(consulta: ConsultaTitulos): Promise<Record<string, string>>;
  /** Busca textual (sem acento, todas as palavras) nas mensagens do próprio usuário, mais relevantes primeiro. */
  buscar(consulta: ConsultaBusca): Promise<ChatMensagemLida[]>;
}

export const ARMAZENAMENTO_DE_CHAT = 'ARMAZENAMENTO_DE_CHAT';

/** Cria só o armazenamento escolhido: o outro nem é instanciado (não tenta conectar, não loga aviso). */
export const armazenamentoDeChatProvider = {
  provide: ARMAZENAMENTO_DE_CHAT,
  inject: [ConfigService, DATABASE_CONNECTION],
  useFactory: (configService: ConfigService, conexaoBancoDados: Knex): ArmazenamentoDeChat => {
    const configuracao = configService.obter();
    switch (configuracao.chat.armazenamento) {
      case 'postgres':
        return new ChatMensagemPostgresRepository(conexaoBancoDados);
      case 'elasticsearch':
        return new ChatMensagemElasticsearchRepository(criarClienteElasticsearchChat(configuracao.elasticsearch));
      default:
        return new ChatMensagemOpenSearchRepository(criarClienteOpenSearchChat(configuracao.openSearch));
    }
  },
};
