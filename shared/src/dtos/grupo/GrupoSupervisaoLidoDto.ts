import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';
import { MensagemDiretaSupervisaoParticipanteDto } from '../mensagem-direta/MensagemDiretaSupervisaoParticipanteDto';

/** Uma página de um grupo aberto na supervisão, da mais nova para a mais antiga. */
export interface GrupoSupervisaoLidoDto {
    grupoId: number;
    conversaId: string;
    nome: string;
    membros: MensagemDiretaSupervisaoParticipanteDto[];
    mensagens: MensagemDiretaResumoDto[];
    /** `null` quando não há página mais antiga. */
    proximoCursor: string | null;
    /** Esta abertura gerou o aviso aos membros (no máximo um por leitor, grupo e dia). */
    membrosAvisados: boolean;
}
