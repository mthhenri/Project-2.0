import { Client } from '@elastic/elasticsearch';
import { ConfiguracaoElasticsearch } from '../../../config/config.interface';
import { BaldeConversa } from '../domain/chat-consultas';
import { ChatMensagemFonte } from '../domain/chat-mensagem.documento';
import { ChatConversaFonte, ChatMensagemIndiceRepository, ResultadoDaPesquisa } from './chat-mensagem-indice.repository';

/**
 * O pedaço do cliente do Elasticsearch (`@elastic/elasticsearch` 9) que o chat usa. Diferente do OpenSearch, a resposta vem direto (sem
 * `body`) e o corpo da requisição é espalhado nos parâmetros (`document`, `settings`, `mappings`, `query`, `aggs`...).
 */
export interface ClienteElasticsearchChat {
  indices: {
    exists(parametros: { index: string }): Promise<boolean>;
    create(parametros: { index: string } & Record<string, unknown>): Promise<unknown>;
    putMapping(parametros: { index: string } & Record<string, unknown>): Promise<unknown>;
  };
  index(parametros: { index: string; id: string; document: unknown; refresh: 'wait_for' }): Promise<unknown>;
  search(parametros: { index: string } & Record<string, unknown>): Promise<{
    hits: { hits: { _source?: ChatMensagemFonte & Partial<ChatConversaFonte> }[] };
    aggregations?: { conversas?: { buckets: BaldeConversa[] } };
  }>;
}

/**
 * Cria o cliente real a partir da configuração. Este arquivo é o único que importa o pacote do Elasticsearch. Autenticação: chave de API
 * (Elastic Cloud) ou usuário e senha; sem nenhuma, conecta sem autenticar (só para um servidor de desenvolvimento com a segurança desligada).
 */
export function criarClienteElasticsearchChat({ url, usuario, senha, apiKey }: ConfiguracaoElasticsearch): ClienteElasticsearchChat {
  const autenticacao = apiKey ? { apiKey } : usuario && senha ? { username: usuario, password: senha } : undefined;
  return new Client({ node: url, ...(autenticacao ? { auth: autenticacao } : {}) }) as unknown as ClienteElasticsearchChat;
}

/**
 * Mensagens do chat no Elasticsearch (task 163), o armazenamento da produção de verdade (`CHAT_ARMAZENAMENTO=elasticsearch`). A lógica vive
 * em `ChatMensagemIndiceRepository`, igual à do OpenSearch; aqui só a fala com o cliente do Elasticsearch.
 */
export class ChatMensagemElasticsearchRepository extends ChatMensagemIndiceRepository {
  protected readonly servico = 'Elasticsearch';

  constructor(private readonly cliente: ClienteElasticsearchChat) {
    super();
  }

  protected async existeIndice(indice: string): Promise<boolean> {
    return this.cliente.indices.exists({ index: indice });
  }

  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    await this.cliente.indices.create({ index: indice, ...(mapeamento as Record<string, unknown>) });
  }

  protected async acrescentarCampos(indice: string, propriedades: unknown): Promise<void> {
    await this.cliente.indices.putMapping({ index: indice, properties: propriedades as Record<string, unknown> });
  }

  protected async gravarDocumento(indice: string, id: string, documento: unknown): Promise<void> {
    await this.cliente.index({ index: indice, id, document: documento, refresh: 'wait_for' });
  }

  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisa> {
    const resposta = await this.cliente.search({ index: indice, ...(consulta as Record<string, unknown>) });
    return {
      fontes: resposta.hits.hits.flatMap((acerto) => (acerto._source ? [acerto._source] : [])),
      baldes: resposta.aggregations?.conversas?.buckets ?? [],
    };
  }
}
