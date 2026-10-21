import { Client } from '@opensearch-project/opensearch';
import { ConfiguracaoOpenSearch } from '../../../config/config.interface';
import { BaldeConversaDireta } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaFonte } from '../domain/mensagem-direta.documento';
import { MensagemDiretaIndiceRepository, ResultadoDaPesquisaDireta } from './mensagem-direta-indice.repository';

/** O pedaço do cliente do OpenSearch que as mensagens diretas usam (o cliente real o satisfaz; os testes passam um falso). */
export interface ClienteOpenSearchMensagemDireta {
  indices: {
    exists(parametros: { index: string }): Promise<{ body: boolean }>;
    create(parametros: { index: string; body: unknown }): Promise<unknown>;
  };
  index(parametros: { index: string; id: string; body: unknown; refresh: 'wait_for'; op_type: 'create' }): Promise<unknown>;
  get(parametros: { index: string; id: string }): Promise<{ body: { _source: MensagemDiretaFonte } }>;
  search(parametros: { index: string; body: unknown }): Promise<{
    body: {
      hits: { hits: { _source: MensagemDiretaFonte }[] };
      aggregations?: {
        conversas?: { buckets: BaldeConversaDireta[] };
        total?: { value: number };
        nao_lidas?: { buckets: Record<string, { doc_count: number }> };
      };
    };
  }>;
}

/** Cria o cliente real a partir da configuração. */
export function criarClienteOpenSearchMensagemDireta({ url, usuario, senha }: ConfiguracaoOpenSearch): ClienteOpenSearchMensagemDireta {
  return new Client({ node: url, ...(usuario && senha ? { auth: { username: usuario, password: senha } } : {}) }) as unknown as ClienteOpenSearchMensagemDireta;
}

/**
 * Mensagens entre colaboradores no OpenSearch (task 206), o armazenamento do desenvolvimento (`CHAT_ARMAZENAMENTO=opensearch`). A lógica
 * vive em `MensagemDiretaIndiceRepository`, igual à do Elasticsearch; aqui só a fala com o cliente do OpenSearch (resposta no envelope `body`).
 */
export class MensagemDiretaOpenSearchRepository extends MensagemDiretaIndiceRepository {
  protected readonly servico = 'OpenSearch';

  constructor(private readonly cliente: ClienteOpenSearchMensagemDireta) {
    super();
  }

  protected async existeIndice(indice: string): Promise<boolean> {
    return (await this.cliente.indices.exists({ index: indice })).body;
  }

  protected async criarIndice(indice: string, mapeamento: unknown): Promise<void> {
    await this.cliente.indices.create({ index: indice, body: mapeamento });
  }

  protected async gravarDocumentoNovo(indice: string, id: string, documento: unknown): Promise<boolean> {
    try {
      await this.cliente.index({ index: indice, id, body: documento, refresh: 'wait_for', op_type: 'create' });
      return true;
    } catch (erro) {
      if (this.ehConflito(erro)) return false;
      throw erro;
    }
  }

  protected async lerDocumento(indice: string, id: string): Promise<MensagemDiretaFonte | null> {
    try {
      return (await this.cliente.get({ index: indice, id })).body._source;
    } catch (erro) {
      if (this.ehNaoEncontrado(erro)) return null;
      throw erro;
    }
  }

  protected async pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisaDireta> {
    const { body } = await this.cliente.search({ index: indice, body: consulta });
    return {
      fontes: body.hits.hits.map((acerto) => acerto._source),
      baldes: body.aggregations?.conversas?.buckets ?? [],
      naoLidas: body.aggregations?.nao_lidas?.buckets,
      total: body.aggregations?.total?.value,
    };
  }
}
