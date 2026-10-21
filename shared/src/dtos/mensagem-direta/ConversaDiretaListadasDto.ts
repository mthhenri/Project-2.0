import { ConversaDiretaResumoDto } from './ConversaDiretaResumoDto';

/** As conversas do usuário, da que teve mensagem mais recente para a mais antiga. */
export interface ConversaDiretaListadasDto {
  conversas: ConversaDiretaResumoDto[];
}
