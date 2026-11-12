import { TipoGrupoEnum } from '../../enums/tipo-grupo.enum';
import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';
import { GrupoMembroResumoDto } from './GrupoMembroResumoDto';

/** Um grupo do usuário, para a lista do popup e para o cabeçalho da conversa. */
export interface GrupoResumoDto {
    grupoId: number;
    /** `G<grupoId>`: o `conversaId` das mensagens do grupo e dos eventos. */
    conversaId: string;
    nome: string;
    tipo: TipoGrupoEnum;
    /** `#RRGGBB`; `null` = degradê das cores dos membros. */
    corAvatar: string | null;
    /** Um emoji no lugar das iniciais; `null` = iniciais do nome. */
    emojiAvatar: string | null;
    criadorUsuarioId: number;
    membros: GrupoMembroResumoDto[];
    /** `null` quando o grupo ainda não tem mensagem. */
    ultimaMensagem: MensagemDiretaResumoDto | null;
    /** Mensagens de pessoa, que não são minhas, mais novas que a leitura (ou que a minha última entrada, o que for mais novo). */
    naoLidas: number;
    silenciada: boolean;
    /** Há gestor ou administrador entre os membros atuais: a supervisão não lê o grupo. Canal nunca é privado (a supervisão o lê sempre). */
    privado: boolean;
    /** Canal: o gestor ou administrador que ainda não escreveu nele lê por tipo, sem ser membro, e a leitura é auditada. Grupo livre e canal de membro: `false`. */
    leituraPorSupervisao: boolean;
}
