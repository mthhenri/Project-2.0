import { TipoGrupoEnum } from '../../enums/tipo-grupo.enum';
import { MensagemDiretaSupervisaoParticipanteDto } from '../mensagem-direta/MensagemDiretaSupervisaoParticipanteDto';

/** Um grupo supervisionável, para a lista da supervisão. */
export interface GrupoSupervisaoResumoDto {
    grupoId: number;
    conversaId: string;
    tipo: TipoGrupoEnum;
    nome: string;
    corAvatar: string | null;
    emojiAvatar: string | null;
    membros: MensagemDiretaSupervisaoParticipanteDto[];
    totalMensagens: number;
    /** Quando foi a última mensagem (que casa com o filtro). O texto não vem na lista: ler o conteúdo é abrir o grupo, que é auditado. */
    ultimaMensagemData: Date;
}
