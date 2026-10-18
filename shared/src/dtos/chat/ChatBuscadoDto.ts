import { ChatMensagemResumoDto } from './ChatMensagemResumoDto';

/** Resultado da busca: mais relevantes primeiro. */
export interface ChatBuscadoDto {
  mensagens: ChatMensagemResumoDto[];
}
