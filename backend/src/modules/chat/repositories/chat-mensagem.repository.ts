import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  ConsultaBusca,
  ConsultaConversa,
  INDICE_CHAT_MENSAGEM,
  MAPEAMENTO_CHAT_MENSAGEM,
  montarConsultaBusca,
  montarConsultaConversa,
} from '../domain/chat-consultas';
import { ChatMensagemFonte, ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';

/** O pedaço do cliente do OpenSearch que o chat usa (o cliente real o satisfaz; os testes passam um falso). */
export interface ClienteOpenSearchChat {
  indices: {
    exists(parametros: { index: string }): Promise<{ body: boolean }>;
    create(parametros: { index: string; body: unknown }): Promise<unknown>;
  };
  index(parametros: { index: string; id: string; body: unknown; refresh: 'wait_for' }): Promise<unknown>;
  search(parametros: { index: string; body: unknown }): Promise<{ body: { hits: { hits: { _source: ChatMensagemFonte }[] } } }>;
}

export const CLIENTE_OPENSEARCH_CHAT = 'CLIENTE_OPENSEARCH_CHAT';

/** Cria o cliente real a partir do `ConfigService`. Este arquivo é o único que importa o pacote do OpenSearch. */
export const clienteOpenSearchChatProvider = {
  provide: CLIENTE_OPENSEARCH_CHAT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ClienteOpenSearchChat => {
    const { url, usuario, senha } = configService.obter().openSearch;
    return new Client({ node: url, ...(usuario && senha ? { auth: { username: usuario, password: senha } } : {}) }) as unknown as ClienteOpenSearchChat;
  },
};

/**
 * Mensagens do chat no OpenSearch (task 135): um documento por mensagem, gravado uma vez e nunca reescrito (não há método de exclusão
 * nem de alteração). Trocar por Elasticsearch é mexer só aqui.
 */
@Injectable()
export class ChatMensagemRepository implements OnModuleInit {
  private readonly logger = new Logger(ChatMensagemRepository.name);
  private indiceGarantido = false;

  constructor(@Inject(CLIENTE_OPENSEARCH_CHAT) private readonly cliente: ClienteOpenSearchChat) {}

  /** O OpenSearch fora do ar na subida não derruba o backend: o chat fica indisponível e o índice é criado na primeira chamada. */
  async onModuleInit(): Promise<void> {
    try {
      await this.garantirIndice();
    } catch {
      this.logger.warn('OpenSearch indisponível na subida: o chat fica indisponível até ele voltar');
    }
  }

  async gravar(mensagem: ChatMensagemNova): Promise<ChatMensagemLida> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const id = randomUUID();
      const fonte = paraFonte(mensagem, id, new Date());
      await this.cliente.index({ index: INDICE_CHAT_MENSAGEM, id, body: fonte, refresh: 'wait_for' });
      return deFonte(fonte);
    });
  }

  async listarConversa(consulta: ConsultaConversa): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const resposta = await this.cliente.search({ index: INDICE_CHAT_MENSAGEM, body: montarConsultaConversa(consulta) });
      return resposta.body.hits.hits.map((acerto) => deFonte(acerto._source));
    });
  }

  async buscar(consulta: ConsultaBusca): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const resposta = await this.cliente.search({ index: INDICE_CHAT_MENSAGEM, body: montarConsultaBusca(consulta) });
      return resposta.body.hits.hits.map((acerto) => deFonte(acerto._source));
    });
  }

  /** Cria o índice se não existir. Idempotente: subir de novo não falha nem duplica. */
  private async garantirIndice(): Promise<void> {
    if (this.indiceGarantido) return;
    const existe = await this.cliente.indices.exists({ index: INDICE_CHAT_MENSAGEM });
    if (!existe.body) {
      try {
        await this.cliente.indices.create({ index: INDICE_CHAT_MENSAGEM, body: MAPEAMENTO_CHAT_MENSAGEM });
      } catch (erro) {
        // Outra instância criou entre o exists e o create.
        if (!JSON.stringify(erro).includes('resource_already_exists_exception')) throw erro;
      }
    }
    this.indiceGarantido = true;
  }

  private async proteger<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (erro instanceof BusinessException) throw erro;
      this.logger.error(`Falha no OpenSearch: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new BusinessException('O chat está indisponível no momento (armazenamento das mensagens fora do ar). Tente de novo em instantes.');
    }
  }
}
