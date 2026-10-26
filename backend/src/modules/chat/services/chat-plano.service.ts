import { Inject, Injectable } from '@nestjs/common';
import {
  AutorChatEnum,
  ChatEventoDto,
  ChatMensagemEnviarDto,
  ContextoChatEnum,
  montarConversaIdDoPlano,
  NIVEL_DO_TIPO_DE_PROMPT,
  PlanoAbaEnum,
  PlanoConversaRecuperadaDto,
  PlanoRecuperadoDto,
  PlanoRecuperarDto,
  podeVerAbaDoPlano,
  StandardResponse,
  TipoPromptEnum,
  TipoUsuarioEnum,
} from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PlanoService } from '../../plano/services/plano.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { ChatMensagemLida, paraResumo } from '../domain/chat-mensagem.documento';
import { ARMAZENAMENTO_DE_CHAT, ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';
import { ChatService } from './chat.service';

/** Teto de tokens de cada chamada do planejamento: a escrita de um texto longo cabe numa chamada de ferramenta só. */
export const MAXIMO_TOKENS_DO_PLANEJAMENTO = 8192;
/** O quanto de cada aba entra nas instruções; o resto a IA lê com `consultar_plano`. */
export const LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO = 20_000;

const PROMPT_DA_ABA: Record<PlanoAbaEnum, TipoPromptEnum> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: TipoPromptEnum.PLANO_DESCRICAO_TECNICA,
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: TipoPromptEnum.PLANO_DESCRICAO_CLIENTE,
  [PlanoAbaEnum.DOCUMENTACAO]: TipoPromptEnum.PLANO_DOCUMENTACAO,
};

const ROTULO_DA_ABA: Record<PlanoAbaEnum, string> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: 'Descrição técnica (aba DESCRICAO_TECNICA)',
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: 'Descrição do cliente (aba DESCRICAO_CLIENTE)',
  [PlanoAbaEnum.DOCUMENTACAO]: 'Documentação (aba DOCUMENTACAO)',
};

/**
 * A conversa do planejamento (task 234): cada plano tem a sua, de todos que têm acesso a ele (a regra de acesso é a da `PlanoService`; quem não vê o
 * plano recebe "não encontrado"). A IA recebe o prompt do planejamento, como escrever cada aba que a pessoa pode ver, o plano com o documento e a
 * versão **de agora**, e as ferramentas de leitura do sistema mais as do plano. O envio reaproveita o laço do `ChatService`; o custo de cada resposta
 * é de quem enviou a mensagem (as mensagens da IA levam o `usuarioId` dele, e a aba Custos soma por mensagem).
 */
@Injectable()
export class ChatPlanoService {
  constructor(
    @Inject(ARMAZENAMENTO_DE_CHAT) private readonly chatMensagemRepositorio: ArmazenamentoDeChat,
    private readonly chatService: ChatService,
    private readonly planoService: PlanoService,
    private readonly promptService: PromptService,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {}

  /** As mensagens do plano, de todos, em ordem, com o nome de quem escreveu. */
  async recuperarConversa(dto: PlanoRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoConversaRecuperadaDto>> {
    await this.planoService.recuperar(dto, usuarioAtivo);
    const conversaId = montarConversaIdDoPlano(dto.id);
    const mensagens = await this.chatMensagemRepositorio.listarConversa({ conversaId });
    const autores = await this.nomesDosAutores(mensagens, usuarioAtivo.sub);
    return {
      sucesso: true,
      dados: { conversaId, planoId: dto.id, mensagens: mensagens.map(paraResumo), autores: Object.fromEntries(autores) },
      mensagem: 'Conversa do plano recuperada com sucesso',
    };
  }

  /** Envia a mensagem na conversa do plano e emite os eventos da resposta (os mesmos do chat). 404 se a pessoa não vê o plano; 409 com a IA desligada. */
  async enviarMensagem(dto: PlanoRecuperarDto, mensagem: ChatMensagemEnviarDto, usuarioAtivo: JwtPayload, emitir: (evento: ChatEventoDto) => void): Promise<void> {
    await this.planoService.recuperar(dto, usuarioAtivo);
    const conversaId = montarConversaIdDoPlano(dto.id);
    const autores = await this.nomesDosAutores(await this.chatMensagemRepositorio.listarConversa({ conversaId }), usuarioAtivo.sub);
    const falamVarios = autores.size > 1;

    await this.chatService.enviarMensagem(usuarioAtivo, mensagem, emitir, {
      contexto: ContextoChatEnum.PLANEJAMENTO,
      conversaId,
      montarInstrucoes: () => this.montarInstrucoes(dto, usuarioAtivo, autores),
      nivel: NIVEL_DO_TIPO_DE_PROMPT[TipoPromptEnum.PLANEJAMENTO],
      maximoTokens: MAXIMO_TOKENS_DO_PLANEJAMENTO,
      escopoDeFerramentas: 'PLANEJAMENTO',
      // Duas ou mais pessoas na conversa: o modelo precisa saber quem disse o quê.
      rotularMensagemDoUsuario: (lida) => (falamVarios ? `[${autores.get(lida.usuarioId) ?? 'Alguém'}] ${lida.texto}` : lida.texto),
    });
  }

  /**
   * As instruções do turno: o prompt do planejamento, como escrever cada aba que **esta pessoa** pode ver (a do cliente só para gestor e
   * administrador, também no prompt) e o plano como está agora. Montadas a cada resposta, porque o documento muda entre uma e outra.
   */
  private async montarInstrucoes(dto: PlanoRecuperarDto, usuarioAtivo: JwtPayload, autores: Map<number, string>): Promise<string> {
    const plano = (await this.planoService.recuperar(dto, usuarioAtivo)).dados as PlanoRecuperadoDto;
    const abas = (Object.values(PlanoAbaEnum) as PlanoAbaEnum[]).filter((aba) => podeVerAbaDoPlano(aba, usuarioAtivo.tipo));

    const prompt = await this.promptService.obterAtivo(TipoPromptEnum.PLANEJAMENTO);
    const comoEscrever: string[] = [];
    for (const aba of abas) comoEscrever.push(`${ROTULO_DA_ABA[aba]}:\n${(await this.promptService.obterAtivo(PROMPT_DA_ABA[aba])).conteudo}`);

    return [
      prompt.conteudo,
      `Como escrever cada texto:\n\n${comoEscrever.join('\n\n')}`,
      this.descreverPlano(plano, abas, usuarioAtivo, autores),
    ].join('\n\n');
  }

  private descreverPlano(plano: PlanoRecuperadoDto, abas: PlanoAbaEnum[], usuarioAtivo: JwtPayload, autores: Map<number, string>): string {
    const nomeDeQuemFala = autores.get(usuarioAtivo.sub);
    const cabecalho = [
      `O plano aberto: id ${plano.id}, "${plano.titulo}".`,
      plano.projetoNome ? `Projeto: ${plano.projetoNome}.` : 'Plano pessoal, sem projeto.',
      plano.demandaNome ? `Demanda ligada: ${plano.demandaNome}.` : 'Nenhuma demanda ligada.',
      nomeDeQuemFala ? `Quem está falando agora: ${nomeDeQuemFala} (${usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR ? 'desenvolvedor' : 'gestor ou administrador'}).` : '',
      `Versão do documento agora: ${plano.versao}. Use-a em escrever_no_plano; depois de escrever, use a versão que o resultado devolver.`,
      `Abas que esta pessoa vê: ${abas.join(', ')}.`,
    ].filter((linha) => linha !== '');
    const textos = abas.map((aba) => {
      const texto = this.textoDaAba(plano, aba);
      const cortado = texto.length > LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO;
      const corpo = texto.trim() === '' ? '(vazia)' : cortado ? `${texto.slice(0, LIMITE_CARACTERES_DA_ABA_NO_CONTEXTO)}\n[texto cortado: leia o resto com consultar_plano]` : texto;
      return `### ${ROTULO_DA_ABA[aba]}\n${corpo}`;
    });
    return `${cabecalho.join('\n')}\n\n${textos.join('\n\n')}`;
  }

  private textoDaAba(plano: PlanoRecuperadoDto, aba: PlanoAbaEnum): string {
    switch (aba) {
      case PlanoAbaEnum.DESCRICAO_TECNICA:
        return plano.descricaoTecnica ?? '';
      case PlanoAbaEnum.DESCRICAO_CLIENTE:
        return plano.descricaoCliente ?? '';
      default:
        return plano.documentacao ?? '';
    }
  }

  /** O nome de quem escreveu na conversa e de quem está enviando agora (a IA e o sistema não têm nome). */
  private async nomesDosAutores(mensagens: ChatMensagemLida[], quemEnvia: number): Promise<Map<number, string>> {
    const ids = new Set<number>([quemEnvia]);
    for (const mensagem of mensagens) if (mensagem.autor === AutorChatEnum.USUARIO) ids.add(mensagem.usuarioId);
    const nomes = await this.usuarioRepositorio.listarNomesPorIds({ usuarioIds: [...ids] });
    return new Map(nomes.map((nome) => [nome.id, nome.nomeCompleto]));
  }
}
