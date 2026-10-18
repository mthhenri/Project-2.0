import { Injectable, Logger } from '@nestjs/common';
import {
  AutorChatEnum,
  ChatBuscadoDto,
  ChatBuscarDto,
  ChatConversaRecuperarDto,
  ChatConversasListadasDto,
  ChatEventoDto,
  ChatHojeRecuperadoDto,
  ChatMensagemEnviarDto,
  ContextoChatEnum,
  EstadoIaEnum,
  NivelIaEnum,
  StandardResponse,
  TipoPromptEnum,
} from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { IaException } from '../../ia/domain/ia.exception';
import { IaBloco, IaMensagem, IaResposta, IaTokens } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { limparTitulo } from '../domain/chat-consultas';
import { montarConversaId } from '../domain/chat-conversa';
import { ChatMensagemLida, paraResumo } from '../domain/chat-mensagem.documento';
import { ChatMensagemRepository } from '../repositories/chat-mensagem.repository';

/** Mensagens do dia que viram contexto para o modelo (a memória de longo prazo está nos dados, não no chat). */
export const JANELA_DE_MENSAGENS = 40;
/** Voltas de ferramenta por mensagem do usuário: cada volta é uma chamada ao modelo. */
export const MAXIMO_DE_VOLTAS = 8;
/** Teto de tokens de cada chamada do chat. */
export const MAXIMO_TOKENS_DO_CHAT = 2048;

/** Instrução interna (não editável) para dar nome à conversa: só o nome, curto, sem enfeite. */
export const INSTRUCOES_TITULO =
  'Dê um nome curto (de 3 a 6 palavras, em português, sem aspas nem ponto final) para a conversa a seguir. Responda só com o nome.';

const MENSAGEM_GENERICA = 'Serviço de IA temporariamente indisponível';

/** O que fica guardado em `conteudo_bruto` da mensagem da IA: as trocas do turno, para remontar a conversa depois. */
interface ConteudoBrutoDoTurno {
  mensagens: IaMensagem[];
}

/**
 * Conversa do dia com a IA (task 138). Uma conversa por usuário por dia; a mensagem do usuário é gravada **antes** de chamar a IA;
 * a resposta é transmitida enquanto é gerada (nível rápido, com o prompt `CONVERSA` ativo e as ferramentas que o usuário pode usar),
 * com um laço de ferramentas de no máximo 8 voltas. Ferramentas de proposta só criam propostas: nada é gravado sem confirmação.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  /** Conversas com uma mensagem em andamento: um segundo envio na mesma conversa recebe 409. */
  private readonly emAndamento = new Set<string>();

  constructor(
    private readonly chatMensagemRepositorio: ChatMensagemRepository,
    private readonly iaService: IaService,
    private readonly promptService: PromptService,
    private readonly ferramentaIaRegistro: FerramentaIaRegistro,
    private readonly propostaIaService: PropostaIaService,
    private readonly configService: ConfigService,
  ) {}

  async recuperarHoje(usuarioAtivo: JwtPayload): Promise<StandardResponse<ChatHojeRecuperadoDto>> {
    const conversaId = this.conversaDeHoje(usuarioAtivo);
    const mensagens = await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: usuarioAtivo.sub });
    return { sucesso: true, dados: { conversaId, mensagens: mensagens.map(paraResumo) }, mensagem: 'Conversa recuperada com sucesso' };
  }

  /** A lista do histórico: uma entrada por dia com conversa, da mais recente à mais antiga. */
  async listarConversas(usuarioAtivo: JwtPayload): Promise<StandardResponse<ChatConversasListadasDto>> {
    const baldes = await this.chatMensagemRepositorio.listarConversas({ usuarioId: usuarioAtivo.sub });
    const titulos = await this.chatMensagemRepositorio.listarTitulos({
      usuarioId: usuarioAtivo.sub,
      conversaIds: baldes.map((balde) => balde.key),
    });
    const conversas = baldes.map((balde) => ({
      conversaId: balde.key,
      data: balde.key.slice(-10),
      titulo: titulos[balde.key] ?? null,
      primeiraMensagem: balde.primeira.hits.hits[0]?._source.texto ?? '',
      quantidadeDeMensagens: balde.doc_count,
      ultimaMensagemDate: new Date(balde.ultima.value),
    }));
    return { sucesso: true, dados: { conversas }, mensagem: 'Conversas listadas com sucesso' };
  }

  /** A conversa de um dia do próprio usuário; o dono vem do token, então um dia sem mensagens devolve a lista vazia. */
  async recuperarConversa(dto: ChatConversaRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ChatHojeRecuperadoDto>> {
    const conversaId = `${usuarioAtivo.sub}-${dto.data}`;
    const mensagens = await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: usuarioAtivo.sub });
    return { sucesso: true, dados: { conversaId, mensagens: mensagens.map(paraResumo) }, mensagem: 'Conversa recuperada com sucesso' };
  }

  async buscar(dto: ChatBuscarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ChatBuscadoDto>> {
    const encontradas = await this.chatMensagemRepositorio.buscar({
      usuarioId: usuarioAtivo.sub,
      texto: dto.texto,
      inicio: dto.inicio ? new Date(dto.inicio) : undefined,
      fim: dto.fim ? new Date(dto.fim) : undefined,
    });
    return { sucesso: true, dados: { mensagens: encontradas.map(paraResumo) }, mensagem: 'Busca realizada com sucesso' };
  }

  /**
   * Envia a mensagem e emite os eventos da resposta. Lança (antes de qualquer evento) se a IA está desligada ou se já há uma mensagem
   * em andamento; depois disso, toda falha vira o evento `erro`, e o método termina sem lançar.
   */
  async enviarMensagem(usuarioAtivo: JwtPayload, dto: ChatMensagemEnviarDto, emitir: (evento: ChatEventoDto) => void): Promise<void> {
    if ((await this.iaService.obterEstado()) === EstadoIaEnum.DESLIGADA) throw new ConflictException('A IA está desligada');

    const conversaId = this.conversaDeHoje(usuarioAtivo);
    if (this.emAndamento.has(conversaId)) throw new ConflictException('A IA ainda está respondendo à mensagem anterior');
    this.emAndamento.add(conversaId);

    const propostasDoTurno: number[] = [];
    try {
      await this.chatMensagemRepositorio.gravar({
        conversaId,
        usuarioId: usuarioAtivo.sub,
        contexto: ContextoChatEnum.CHAT,
        autor: AutorChatEnum.USUARIO,
        texto: dto.texto,
      });
      await this.responder(usuarioAtivo, conversaId, propostasDoTurno, emitir);
      await this.nomearConversa(usuarioAtivo, conversaId);
    } catch (erro) {
      await this.registrarFalha(usuarioAtivo, conversaId, propostasDoTurno, erro, emitir);
    } finally {
      this.emAndamento.delete(conversaId);
    }
  }

  private async responder(
    usuarioAtivo: JwtPayload,
    conversaId: string,
    propostasDoTurno: number[],
    emitir: (evento: ChatEventoDto) => void,
  ): Promise<void> {
    const historico = await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: usuarioAtivo.sub });
    const prompt = await this.promptService.obterAtivo(TipoPromptEnum.CONVERSA);
    const ferramentas = this.ferramentaIaRegistro.listarParaUsuario(usuarioAtivo);

    const mensagens = this.montarMensagens(historico);
    const trocasDoTurno: IaMensagem[] = [];
    const tokens: IaTokens = { entrada: 0, saida: 0, cache: 0 };
    let texto = '';
    let ultima: IaResposta | undefined;

    for (let volta = 1; volta <= MAXIMO_DE_VOLTAS; volta++) {
      const resposta = await this.iaService.transmitir(
        { nivel: NivelIaEnum.RAPIDO, instrucoes: prompt.conteudo, mensagens, ferramentas, maximoTokens: MAXIMO_TOKENS_DO_CHAT },
        (trecho) => emitir({ tipo: 'trecho', texto: trecho }),
      );
      ultima = resposta;
      texto += resposta.texto;
      tokens.entrada += resposta.tokens.entrada;
      tokens.saida += resposta.tokens.saida;
      tokens.cache += resposta.tokens.cache;

      const mensagemDaIa: IaMensagem = { papel: 'ia', conteudo: resposta.blocos };
      mensagens.push(mensagemDaIa);
      trocasDoTurno.push(mensagemDaIa);
      if (resposta.motivoParada !== 'uso_ferramenta') break;

      const resultados = await this.executarFerramentas(resposta.blocos, usuarioAtivo, propostasDoTurno, emitir);
      const mensagemDeResultados: IaMensagem = { papel: 'usuario', conteudo: resultados };
      mensagens.push(mensagemDeResultados);
      trocasDoTurno.push(mensagemDeResultados);

      if (volta === MAXIMO_DE_VOLTAS) throw new Error(`A IA passou de ${MAXIMO_DE_VOLTAS} voltas de ferramenta na mesma mensagem`);
    }

    const conteudoBruto: ConteudoBrutoDoTurno = { mensagens: trocasDoTurno };
    const gravada = await this.chatMensagemRepositorio.gravar({
      conversaId,
      usuarioId: usuarioAtivo.sub,
      contexto: ContextoChatEnum.CHAT,
      autor: AutorChatEnum.IA,
      texto,
      nivel: NivelIaEnum.RAPIDO,
      modelo: ultima?.modelo ?? null,
      tokensEntrada: tokens.entrada,
      tokensSaida: tokens.saida,
      tokensCache: tokens.cache,
      propostaId: propostasDoTurno[0] ?? null,
      conteudoBruto,
    });
    emitir({ tipo: 'fim', mensagem: paraResumo(gravada) });
  }

  /**
   * Dá nome à conversa do dia depois da primeira resposta (uma chamada curta no nível rápido). Falhar aqui nunca atrapalha o chat: a
   * lista do histórico cai no trecho da primeira mensagem.
   */
  private async nomearConversa(usuarioAtivo: JwtPayload, conversaId: string): Promise<void> {
    try {
      const existentes = await this.chatMensagemRepositorio.listarTitulos({ usuarioId: usuarioAtivo.sub, conversaIds: [conversaId] });
      if (existentes[conversaId]) return;
      const conversa = await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: usuarioAtivo.sub });
      const primeiraDoUsuario = conversa.find((mensagem) => mensagem.autor === AutorChatEnum.USUARIO);
      const primeiraDaIa = conversa.find((mensagem) => mensagem.autor === AutorChatEnum.IA);
      if (!primeiraDoUsuario || !primeiraDaIa) return;
      const resposta = await this.iaService.gerar({
        nivel: NivelIaEnum.RAPIDO,
        instrucoes: INSTRUCOES_TITULO,
        mensagens: [{ papel: 'usuario', conteudo: `Usuário: ${primeiraDoUsuario.texto}\n\nIA: ${primeiraDaIa.texto}` }],
        maximoTokens: 40,
      });
      const titulo = limparTitulo(resposta.texto);
      if (titulo) await this.chatMensagemRepositorio.gravarTitulo(conversaId, usuarioAtivo.sub, titulo);
    } catch (erro) {
      this.logger.warn(`Não foi possível nomear a conversa ${conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  /** Executa os pedidos de ferramenta de uma volta, em ordem, e devolve os resultados no formato do contrato do provedor. */
  private async executarFerramentas(
    blocos: IaBloco[],
    usuarioAtivo: JwtPayload,
    propostasDoTurno: number[],
    emitir: (evento: ChatEventoDto) => void,
  ): Promise<IaBloco[]> {
    const resultados: IaBloco[] = [];
    for (const bloco of blocos) {
      if (bloco.tipo !== 'uso_ferramenta') continue;
      emitir({ tipo: 'ferramenta', nome: bloco.nome, situacao: 'EXECUTANDO' });
      const resultado = await this.ferramentaIaRegistro.executar(bloco.nome, bloco.entrada, usuarioAtivo);
      emitir({ tipo: 'ferramenta', nome: bloco.nome, situacao: resultado.erro ? 'ERRO' : 'CONCLUIDA' });
      if (resultado.propostaId !== undefined) {
        propostasDoTurno.push(resultado.propostaId);
        emitir({ tipo: 'proposta', propostaId: resultado.propostaId });
      }
      resultados.push({ tipo: 'resultado_ferramenta', usoId: bloco.id, conteudo: resultado.conteudo, erro: resultado.erro });
    }
    return resultados;
  }

  /**
   * Falha no meio: o usuário vê o motivo (evento `erro` e uma mensagem do sistema na conversa) e nenhuma proposta criada neste turno
   * fica pendente sem a resposta que a explicava.
   */
  private async registrarFalha(
    usuarioAtivo: JwtPayload,
    conversaId: string,
    propostasDoTurno: number[],
    erro: unknown,
    emitir: (evento: ChatEventoDto) => void,
  ): Promise<void> {
    const mensagem = erro instanceof IaException ? erro.mensagem : MENSAGEM_GENERICA;
    if (!(erro instanceof IaException)) {
      this.logger.error(`Falha no chat: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
    for (const propostaId of propostasDoTurno) {
      await this.propostaIaService.recusar(propostaId, usuarioAtivo).catch(() => undefined);
    }
    await this.chatMensagemRepositorio
      .gravar({ conversaId, usuarioId: usuarioAtivo.sub, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.SISTEMA, texto: mensagem })
      .catch(() => undefined);
    emitir({ tipo: 'erro', mensagem });
  }

  /**
   * Remonta o contexto das últimas `JANELA_DE_MENSAGENS` mensagens do dia. Mensagem do usuário é texto; mensagem da IA traz as trocas do
   * turno (inclusive chamadas de ferramenta) em `conteudo_bruto`, ou só o texto se não houver. Mensagem do sistema não vai ao modelo.
   * O contexto sempre começa por um texto do usuário.
   */
  montarMensagens(historico: ChatMensagemLida[]): IaMensagem[] {
    const mensagens: IaMensagem[] = [];
    for (const mensagem of historico.slice(-JANELA_DE_MENSAGENS)) {
      if (mensagem.autor === AutorChatEnum.USUARIO) {
        mensagens.push({ papel: 'usuario', conteudo: mensagem.texto });
      } else if (mensagem.autor === AutorChatEnum.IA) {
        const trocas = (mensagem.conteudoBruto as ConteudoBrutoDoTurno | null)?.mensagens;
        if (Array.isArray(trocas) && trocas.length > 0) mensagens.push(...trocas);
        else if (mensagem.texto) mensagens.push({ papel: 'ia', conteudo: mensagem.texto });
      }
    }
    // Um resultado de ferramenta sem a chamada que o originou seria recusado pelo provedor: começa pela primeira mensagem de texto do usuário.
    while (mensagens.length > 0 && !(mensagens[0].papel === 'usuario' && typeof mensagens[0].conteudo === 'string')) mensagens.shift();
    return mensagens;
  }

  private conversaDeHoje(usuarioAtivo: JwtPayload): string {
    return montarConversaId(usuarioAtivo.sub, new Date(), this.configService.obter().aplicacao.fusoHorario);
  }
}
