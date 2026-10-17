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
  /** Markdown. */
  texto: string;
  /** Só nas mensagens da IA. */
  nivel: NivelIaEnum | null;
  modelo: string | null;
  tokensEntrada: number | null;
  tokensSaida: number | null;
  tokensCache: number | null;
  propostaId: number | null;
  execucaoId: number | null;
  atividadeId: number | null;
  demandaId: number | null;
  createdDate: Date;
}
