import { Client } from '@opensearch-project/opensearch';
import { ConfiguracaoOpenSearch } from '../../../config/config.interface';
import { BaldeConversa } from '../domain/chat-consultas';
import { ChatMensagemFonte } from '../domain/chat-mensagem.documento';
import { ChatConversaFonte, ChatMensagemIndiceRepository, ResultadoDaPesquisa } from './chat-mensagem-indice.repository';

/** O pedaço do cliente do OpenSearch que o chat usa (o cliente real o satisfaz; os testes passam um falso). */
export interface ClienteOpenSearchChat {
  indices: {
    exists(parametros: { index: string }): Promise<{ body: boolean }>;
    create(parametros: { index: string; body: unknown }): Promise<unknown>;
  };
  index(parametros: { index: string; id: string; body: unknown; refresh: 'wait_for' }): Promise<unknown>;
  search(parametros: { index: string; body: unknown }): Promise<{
    body: { hits: { hits: { _source: ChatMensagemFonte & Partial<ChatConversaFonte> }[] }; aggregations?: { conversas?: { buckets: BaldeConversa[] } } };
  }>;
}

/** Cria o cliente real a partir da configuração. Este arquivo é o único que importa o pacote do OpenSearch. */
export function criarClienteOpenSearchChat({ url, usuario, senha }: ConfiguracaoOpenSearch): ClienteOpenSearchChat {
  return new Client({ node: url, ...(usuario && senha ? { auth: { username: usuario, password: senha } } : {}) }) as unknown as ClienteOpenSearchChat;
}

/**
 * Mensagens do chat no OpenSearch (task 135), o armazenamento do desenvolvimento (`CHAT_ARMAZENAMENTO=opensearch`). A lógica vive em
 * `ChatMensagemIndiceRepository`, igual à do Elasticsearch; aqui só a fala com o cliente do OpenSearch (resposta no envelope `body`).
 */
export class ChatMensagemOpenSearchRepository extends ChatMensagemIndiceRepository {
  protected readonly servico = 'OpenSearch';

  constructor(private readonly cliente: ClienteOpenSearchChat) {
    super();
  }

  protected async existeIndice(indice: string): Promise<boolean> {
    return (await this.cliente.indices.exists({ index: indice })).body;
  }

  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    await this.cliente.indices.create({ index: indice, body: mapeamento });
  }

  protected async gravarDocumento(indice: string, id: string, documento: unknown): Promise<void> {
    await this.cliente.index({ index: indice, id, body: documento, refresh: 'wait_for' });
  }

  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisa> {
    const { body } = await this.cliente.search({ index: indice, body: consulta });
    return { fontes: body.hits.hits.map((acerto) => acerto._source), baldes: body.aggregations?.conversas?.buckets ?? [] };
  }
}
