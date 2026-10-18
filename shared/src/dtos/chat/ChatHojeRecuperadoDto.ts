import { ChatMensagemResumoDto } from './ChatMensagemResumoDto';

/** A conversa do dia do usuário, em ordem. */
export interface ChatHojeRecuperadoDto {
  conversaId: string;
  mensagens: ChatMensagemResumoDto[];
}
