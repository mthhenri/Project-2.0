import { ChatConversaResumoDto } from './ChatConversaResumoDto';

/** As conversas do usuário, da mais recente para a mais antiga. */
export interface ChatConversasListadasDto {
  conversas: ChatConversaResumoDto[];
}
