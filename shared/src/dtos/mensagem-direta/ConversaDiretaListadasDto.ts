import { GrupoResumoDto } from '../grupo/GrupoResumoDto';
import { ConversaDiretaResumoDto } from './ConversaDiretaResumoDto';

/** As conversas do usuário, da que teve mensagem mais recente para a mais antiga, e os grupos de que ele é membro (task 246). */
export interface ConversaDiretaListadasDto {
    conversas: ConversaDiretaResumoDto[];
    /** Os grupos do usuário, do que teve mensagem mais recente (grupo sem mensagem vem depois, do mais novo). */
    grupos: GrupoResumoDto[];
}
