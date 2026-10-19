import { ChatMensagemResumoDto } from './ChatMensagemResumoDto';

/** A conversa do dia do usuário, em ordem. */
export interface ChatHojeRecuperadoDto {
  conversaId: string;
  /** Nome da conversa (o do usuário, o da IA ou o padrão "Chat do dia ..."). */
  titulo: string;
  mensagens: ChatMensagemResumoDto[];
}
