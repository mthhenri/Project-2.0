import { Client } from '@elastic/elasticsearch';
import { ConfiguracaoElasticsearch } from '../../../config/config.interface';
import { BaldeConversaDireta } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaFonte } from '../domain/mensagem-direta.documento';
import { MensagemDiretaIndiceRepository, ResultadoDaPesquisaDireta } from './mensagem-direta-indice.repository';

/**
 * O pedaço do cliente do Elasticsearch (`@elastic/elasticsearch` 9) que as mensagens diretas usam. Diferente do OpenSearch, a resposta vem
 * direto (sem `body`) e o corpo da requisição é espalhado nos parâmetros (`document`, `settings`, `mappings`, `query`, `aggs`...).
 */
export interface ClienteElasticsearchMensagemDireta {
  indices: {
    exists(parametros: { index: string }): Promise<boolean>;
    create(parametros: { index: string } & Record<string, unknown>): Promise<unknown>;
  };
  index(parametros: { index: string; id: string; document: unknown; refresh: 'wait_for'; op_type: 'create' }): Promise<unknown>;
  get(parametros: { index: string; id: string }): Promise<{ _source?: MensagemDiretaFonte }>;
  search(parametros: { index: string } & Record<string, unknown>): Promise<{
    hits: { hits: { _source?: MensagemDiretaFonte }[] };
    aggregations?: {
      conversas?: { buckets: BaldeConversaDireta[] };
      total?: { value: number };
      nao_lidas?: { buckets: Record<string, { doc_count: number }> };
    };
  }>;
}

/**
 * Cria o cliente real a partir da configuração. Autenticação: chave de API (Elastic Cloud) ou usuário e senha; sem nenhuma, conecta sem
 * autenticar (só para um servidor de desenvolvimento com a segurança desligada).
 */
export function criarClienteElasticsearchMensagemDireta({ url, usuario, senha, apiKey }: ConfiguracaoElasticsearch): ClienteElasticsearchMensagemDireta {
  const autenticacao = apiKey ? { apiKey } : usuario && senha ? { username: usuario, password: senha } : undefined;
  return new Client({ node: url, ...(autenticacao ? { auth: autenticacao } : {}) }) as unknown as ClienteElasticsearchMensagemDireta;
}

/**
 * Mensagens entre colaboradores no Elasticsearch (task 206), o armazenamento da produção final (`CHAT_ARMAZENAMENTO=elasticsearch`). A lógica
 * vive em `MensagemDiretaIndiceRepository`, igual à do OpenSearch; aqui só a fala com o cliente do Elasticsearch.
 */
export class MensagemDiretaElasticsearchRepository extends MensagemDiretaIndiceRepository {
  protected readonly servico = 'Elasticsearch';

  constructor(private readonly cliente: ClienteElasticsearchMensagemDireta) {
    super();
  }

  protected async existeIndice(indice: string): Promise<boolean> {
    return this.cliente.indices.exists({ index: indice });
  }

  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    await this.cliente.indices.create({ index: indice, ...(mapeamento as Record<string, unknown>) });
  }

  protected async gravarDocumentoNovo(indice: string, id: string, documento: unknown): Promise<boolean> {
    try {
      await this.cliente.index({ index: indice, id, document: documento, refresh: 'wait_for', op_type: 'create' });
      return true;
    } catch (erro) {
      if (this.ehConflito(erro)) return false;
      throw erro;
    }
  }

  protected async lerDocumento(indice: string, id: string): Promise<MensagemDiretaFonte | null> {
    try {
      return (await this.cliente.get({ index: indice, id }))._source ?? null;
    } catch (erro) {
      if (this.ehNaoEncontrado(erro)) return null;
      throw erro;
    }
  }

  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisaDireta> {
    const resposta = await this.cliente.search({ index: indice, ...(consulta as Record<string, unknown>) });
    return {
      fontes: resposta.hits.hits.flatMap((acerto) => (acerto._source ? [acerto._source] : [])),
      baldes: resposta.aggregations?.conversas?.buckets ?? [],
      naoLidas: resposta.aggregations?.nao_lidas?.buckets,
      total: resposta.aggregations?.total?.value,
    };
  }
}
