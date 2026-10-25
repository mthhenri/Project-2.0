import { AssuntoChatEnum } from '../../enums/assunto-chat.enum';
import { AutorChatEnum } from '../../enums/autor-chat.enum';
import { ContextoChatEnum } from '../../enums/contexto-chat.enum';
import { NivelIaEnum } from '../../enums/nivel-ia.enum';

/** Uma mensagem do chat, sem o conteúdo bruto do provedor (que só o backend usa para remontar a conversa). */
export interface ChatMensagemResumoDto {
  id: string;
  /** `<usuarioId>-<yyyy-mm-dd>`: uma conversa por dia. */
  conversaId: string;
  usuarioId: number;
  contexto: ContextoChatEnum;
  autor: AutorChatEnum;
  /** Sobre o que é a mensagem; `null` (mensagem antiga, do sistema ou do check-in) é lido como `SISTEMA`. */
  assunto: AssuntoChatEnum | null;
  /** Markdown. */
  texto: string;
  /** Só nas mensagens da IA. */
  nivel: NivelIaEnum | null;
  modelo: string | null;
  tokensEntrada: number | null;
  tokensSaida: number | null;
  tokensCache: number | null;
  /** As propostas da IA ligadas à mensagem, na ordem em que nasceram (vazio se não houve; a mensagem antiga com uma só vem como lista de um). */
  propostaIds: number[];
  execucaoId: number | null;
  atividadeId: number | null;
  demandaId: number | null;
  createdDate: Date;
}
