import { Logger, OnModuleInit } from '@nestjs/common';
import { MensagemDiretaEnviadaDto, MensagemDiretaResumoDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  BaldeConversaDireta,
  ConsultaBuscaDireta,
  ConsultaConversaDireta,
  ConsultaConversasDoUsuario,
  ConsultaNaoLidas,
  ConsultaSupervisao,
  INDICE_MENSAGEM_DIRETA,
  MAPEAMENTO_MENSAGEM_DIRETA,
  PaginaDeConversasSupervisionadas,
  PaginaDeMensagensDiretas,
  ResumoDeConversaDireta,
  deBaldesDeConversas,
  deBaldesDeNaoLidas,
  montarConsultaBuscaDireta,
  montarConsultaConversaDireta,
  montarConsultaConversasDoUsuario,
  montarConsultaNaoLidas,
  montarConsultaSupervisao,
  montarPaginaDeMensagens,
  validarConsultaBuscaDireta,
  validarConsultaConversaDireta,
  validarConsultaNaoLidas,
} from '../domain/mensagem-direta-consultas';
import {
  MensagemDiretaFonte,
  MensagemDiretaNova,
  deFonteDireta,
  mesmaOrigemDaMensagem,
  paraFonteDireta,
  validarMensagemDiretaNova,
} from '../domain/mensagem-direta.documento';
import { ArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta';

/** O resultado de uma pesquisa já sem o envelope do cliente: os documentos achados e o que cada agregação devolveu. */
export interface ResultadoDaPesquisaDireta {
  fontes: MensagemDiretaFonte[];
  /** Agregação `conversas` (lista do usuário e supervisão). */
  baldes: BaldeConversaDireta[];
  /** Agregação `nao_lidas`: um balde por conversa pedida. */
  naoLidas?: Record<string, { doc_count: number }>;
  /** Agregação `total` (supervisão). */
  total?: number;
}

/**
 * A lógica comum dos armazenamentos das mensagens diretas que guardam num índice de busca (OpenSearch e Elasticsearch): um documento por
 * mensagem, gravado uma vez e nunca reescrito (não há método de exclusão nem de alteração). As consultas e o mapeamento vêm de
 * `mensagem-direta-consultas.ts`, iguais para os dois; cada subclasse só fala com o cliente do seu serviço nos métodos abstratos.
 */
export abstract class MensagemDiretaIndiceRepository implements ArmazenamentoDeMensagemDireta, OnModuleInit {
  /** O nome do serviço, para as mensagens de log. */
  protected abstract readonly servico: string;

  private readonly logger = new Logger(this.constructor.name);
  private indiceGarantido = false;

  protected abstract existeIndice(indice: string): Promise<boolean>;
  protected abstract criarIndice(indice: string, mapeamento: unknown): Promise<void>;
  /** Grava só se o `id` ainda não existe, e só volta quando o documento já aparece nas buscas (`refresh` esperado). `false` quando já existia. */
  protected abstract gravarDocumentoNovo(indice: string, id: string, documento: unknown): Promise<boolean>;
  /** O documento com esse `id`, ou `null` se não existe. */
  protected abstract lerDocumento(indice: string, id: string): Promise<MensagemDiretaFonte | null>;
  protected abstract pesquisar(indice: string, consulta: unknown): Promise<ResultadoDaPesquisaDireta>;

  /** O serviço fora do ar na subida não derruba o backend: o chat fica indisponível e o índice é criado na primeira chamada. */
  async onModuleInit(): Promise<void> {
    try {
      await this.garantirIndice();
    } catch {
      this.logger.warn(`${this.servico} indisponível na subida: o chat entre colaboradores fica indisponível até ele voltar`);
    }
  }

  async gravar(mensagem: MensagemDiretaNova): Promise<MensagemDiretaEnviadaDto> {
    validarMensagemDiretaNova(mensagem);
    return this.proteger(async () => {
      await this.garantirIndice();
      const fonte = paraFonteDireta(mensagem, new Date());
      if (await this.gravarDocumentoNovo(INDICE_MENSAGEM_DIRETA, mensagem.mensagemId, fonte)) {
        return { mensagem: deFonteDireta(fonte), jaExistia: false };
      }
      // Repetição do mesmo envio: devolve o que já está gravado. Mas só para o mesmo autor, na mesma conversa; senão o reenvio de um
      // `mensagemId` alheio devolveria a mensagem de outra pessoa.
      const existente = await this.lerDocumento(INDICE_MENSAGEM_DIRETA, mensagem.mensagemId);
      if (!existente) throw new Error('O documento existia na gravação e não foi encontrado na leitura');
      if (!mesmaOrigemDaMensagem(existente, mensagem)) throw new BusinessException('Esse identificador de mensagem já foi usado');
      return { mensagem: deFonteDireta(existente), jaExistia: true };
    });
  }

  async listarConversa(consulta: ConsultaConversaDireta): Promise<PaginaDeMensagensDiretas> {
    validarConsultaConversaDireta(consulta);
    const montada = montarConsultaConversaDireta(consulta);
    return this.proteger(async () => {
      await this.garantirIndice();
      const { fontes } = await this.pesquisar(INDICE_MENSAGEM_DIRETA, montada);
      return montarPaginaDeMensagens(fontes, consulta.limite, deFonteDireta);
    });
  }

  async listarConversasDoUsuario(consulta: ConsultaConversasDoUsuario): Promise<ResumoDeConversaDireta[]> {
    return this.proteger(async () => {
      await this.garantirIndice();
      const { baldes } = await this.pesquisar(INDICE_MENSAGEM_DIRETA, montarConsultaConversasDoUsuario(consulta));
      return deBaldesDeConversas(baldes, deFonteDireta);
    });
  }

  async contarNaoLidas(consulta: ConsultaNaoLidas): Promise<Record<string, number>> {
    if (consulta.marcadores.length === 0) return {};
    validarConsultaNaoLidas(consulta);
    return this.proteger(async () => {
      await this.garantirIndice();
      const { naoLidas } = await this.pesquisar(INDICE_MENSAGEM_DIRETA, montarConsultaNaoLidas(consulta));
      return deBaldesDeNaoLidas(
        consulta.marcadores.map((marcador) => marcador.conversaId),
        naoLidas,
      );
    });
  }

  async buscar(consulta: ConsultaBuscaDireta): Promise<MensagemDiretaResumoDto[]> {
    validarConsultaBuscaDireta(consulta);
    return this.proteger(async () => {
      await this.garantirIndice();
      const { fontes } = await this.pesquisar(INDICE_MENSAGEM_DIRETA, montarConsultaBuscaDireta(consulta));
      return fontes.map(deFonteDireta);
    });
  }

  async listarTodasConversas(consulta: ConsultaSupervisao): Promise<PaginaDeConversasSupervisionadas> {
    const montada = montarConsultaSupervisao(consulta);
    return this.proteger(async () => {
      await this.garantirIndice();
      const { baldes, total } = await this.pesquisar(INDICE_MENSAGEM_DIRETA, montada);
      return { conversas: deBaldesDeConversas(baldes, deFonteDireta), total: total ?? 0 };
    });
  }

  /** O erro do cliente é um conflito de versão (o `id` já existe)? OpenSearch e Elasticsearch o expõem de formas parecidas. */
  protected ehConflito(erro: unknown): boolean {
    const detalhe = erro as { statusCode?: number; meta?: { statusCode?: number } } | null;
    return detalhe?.statusCode === 409 || detalhe?.meta?.statusCode === 409 || JSON.stringify(erro ?? '').includes('version_conflict_engine_exception');
  }

  /** O erro do cliente é "documento não encontrado"? */
  protected ehNaoEncontrado(erro: unknown): boolean {
    const detalhe = erro as { statusCode?: number; meta?: { statusCode?: number } } | null;
    return detalhe?.statusCode === 404 || detalhe?.meta?.statusCode === 404;
  }

  /** Cria o índice se não existir. Idempotente: subir de novo não falha nem duplica. */
  private async garantirIndice(): Promise<void> {
    if (this.indiceGarantido) return;
    if (!(await this.existeIndice(INDICE_MENSAGEM_DIRETA))) {
      try {
        await this.criarIndice(INDICE_MENSAGEM_DIRETA, MAPEAMENTO_MENSAGEM_DIRETA);
      } catch (erro) {
        // Outra instância criou entre a conferência e a criação (o caso normal de um deploy com duas instâncias subindo juntas).
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
      this.logger.error(`Falha no ${this.servico}: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new BusinessException('O chat entre colaboradores está indisponível no momento (armazenamento das mensagens fora do ar). Tente de novo em instantes.');
    }
  }
}
