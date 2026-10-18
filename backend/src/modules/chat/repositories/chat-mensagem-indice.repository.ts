import { Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  BaldeConversa,
  ConsultaBusca,
  ConsultaConversa,
  ConsultaConversas,
  ConsultaTitulos,
  INDICE_CHAT_CONVERSA,
  INDICE_CHAT_MENSAGEM,
  MAPEAMENTO_CHAT_CONVERSA,
  MAPEAMENTO_CHAT_MENSAGEM,
  montarConsultaBusca,
  montarConsultaConversa,
  montarConsultaConversas,
  montarConsultaTitulos,
} from '../domain/chat-consultas';
import { ChatMensagemFonte, ChatMensagemLida, ChatMensagemNova, deFonte, paraFonte } from '../domain/chat-mensagem.documento';
import { ArmazenamentoDeChat } from './armazenamento-de-chat';

/** Forma do documento de título (índice `chat-conversa`). */
export interface ChatConversaFonte {
  conversa_id: string;
  titulo: string;
}

/** O resultado de uma pesquisa já sem o envelope do cliente: os documentos achados e, na agregação de conversas, os baldes. */
export interface ResultadoDaPesquisa {
  fontes: (ChatMensagemFonte & Partial<ChatConversaFonte>)[];
  baldes: BaldeConversa[];
}

/**
 * A lógica comum dos armazenamentos do chat que guardam as mensagens num índice de busca (OpenSearch e Elasticsearch): um documento por
 * mensagem, gravado uma vez e nunca reescrito (não há método de exclusão nem de alteração), mais um documento de título por conversa.
 * As consultas e os mapeamentos vêm de `chat-consultas.ts`, iguais para os dois; cada subclasse só fala com o cliente do seu serviço
 * nos quatro métodos abstratos (e é o único arquivo que importa o pacote dele).
 */
export abstract class ChatMensagemIndiceRepository implements ArmazenamentoDeChat, OnModuleInit {
  /** O nome do serviço, para as mensagens de log. */
  protected abstract readonly servico: string;

  private readonly logger = new Logger(this.constructor.name);
  private indiceGarantido = false;

  protected abstract existeIndice(indice: string): Promise<boolean>;
  protected abstract criarIndice(indice: string, mapeamento: unknown): Promise<void>;
  /** Grava o documento com o `id` e só volta quando ele já aparece nas buscas (`refresh` esperado). */
  protected abstract gravarDocumento(indice: string, id: string, documento: unknown): Promise<void>;
  protected abstract pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisa>;

  /** O serviço fora do ar na subida não derruba o backend: o chat fica indisponível e o índice é criado na primeira chamada. */
  async onModuleInit(): Promise<void> {
    try {
      await this.garantirIndice();
    } catch {
      this.logger.warn(`${this.servico} indisponível na subida: o chat fica indisponível até ele voltar`);
    }
  }

  async gravar(mensagem: ChatMensagemNova): Promise<ChatMensagemLida> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const id = randomUUID();
      const fonte = paraFonte(mensagem, id, new Date());
      await this.gravarDocumento(INDICE_CHAT_MENSAGEM, id, fonte);
      return deFonte(fonte);
    });
  }

  async listarConversa(consulta: ConsultaConversa): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const resultado = await this.pesquisar(INDICE_CHAT_MENSAGEM, montarConsultaConversa(consulta));
      return resultado.fontes.map(deFonte);
    });
  }

  /** As conversas do usuário (uma por dia), da mais recente à mais antiga, sem as mensagens. */
  async listarConversas(consulta: ConsultaConversas): Promise<BaldeConversa[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      return (await this.pesquisar(INDICE_CHAT_MENSAGEM, montarConsultaConversas(consulta))).baldes;
    });
  }

  /** Guarda (ou troca) o título da conversa. */
  async gravarTitulo(conversaId: string, usuarioId: number, titulo: string): Promise<void> {
    await this.proteger(async () => {
      await this.garantirIndice();
      const documento = { conversa_id: conversaId, usuario_id: usuarioId, titulo, created_date: new Date().toISOString() };
      await this.gravarDocumento(INDICE_CHAT_CONVERSA, conversaId, documento);
    });
  }

  /** Os títulos das conversas pedidas do usuário, por `conversaId` (quem ainda não tem título não aparece). */
  async listarTitulos(consulta: ConsultaTitulos): Promise<Record<string, string>> {
    if (consulta.conversaIds.length === 0) return {};
    return this.proteger(async () => {
      await this.garantirIndice();
      const resultado = await this.pesquisar(INDICE_CHAT_CONVERSA, montarConsultaTitulos(consulta));
      return Object.fromEntries(resultado.fontes.map((fonte) => [fonte.conversa_id, fonte.titulo ?? '']));
    });
  }

  async buscar(consulta: ConsultaBusca): Promise<ChatMensagemLida[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const resultado = await this.pesquisar(INDICE_CHAT_MENSAGEM, montarConsultaBusca(consulta));
      return resultado.fontes.map(deFonte);
    });
  }

  /** Cria os índices se não existirem. Idempotente: subir de novo não falha nem duplica. */
  private async garantirIndice(): Promise<void> {
    if (this.indiceGarantido) return;
    await this.criarIndiceSeNaoExiste(INDICE_CHAT_MENSAGEM, MAPEAMENTO_CHAT_MENSAGEM);
    await this.criarIndiceSeNaoExiste(INDICE_CHAT_CONVERSA, MAPEAMENTO_CHAT_CONVERSA);
    this.indiceGarantido = true;
  }

  private async criarIndiceSeNaoExiste(indice: string, mapeamento: unknown): Promise<void> {
    if (await this.existeIndice(indice)) return;
    try {
      await this.criarIndice(indice, mapeamento);
    } catch (erro) {
      // Outra instância criou entre a conferência e a criação.
      if (!JSON.stringify(erro).includes('resource_already_exists_exception')) throw erro;
    }
  }

  private async proteger<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (erro instanceof BusinessException) throw erro;
      this.logger.error(`Falha no ${this.servico}: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new BusinessException('O chat está indisponível no momento (armazenamento das mensagens fora do ar). Tente de novo em instantes.');
    }
  }
}
