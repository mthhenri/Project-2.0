import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';
import { MensagemDiretaSupervisaoParticipanteDto } from '../mensagem-direta/MensagemDiretaSupervisaoParticipanteDto';

/** Um grupo supervisionável, para a lista da supervisão. */
export interface GrupoSupervisaoResumoDto {
    grupoId: number;
    conversaId: string;
    nome: string;
    corAvatar: string | null;
    emojiAvatar: string | null;
    membros: MensagemDiretaSupervisaoParticipanteDto[];
    totalMensagens: number;
    ultimaMensagem: MensagemDiretaResumoDto;
}
