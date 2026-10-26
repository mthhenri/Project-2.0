import { ChatMensagemResumoDto } from '../chat/ChatMensagemResumoDto';

/** A conversa de um plano (task 234): as mensagens de todos que têm acesso ao plano e o nome de cada autor. */
export interface PlanoConversaRecuperadaDto {
  conversaId: string;
  planoId: number;
  mensagens: ChatMensagemResumoDto[];
  /** Nome de quem escreveu, por `usuarioId` (a IA e o sistema não têm entrada). */
  autores: Record<number, string>;
}
