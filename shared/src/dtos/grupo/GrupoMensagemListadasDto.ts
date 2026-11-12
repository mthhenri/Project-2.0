import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';

/** Uma página da conversa do grupo, da mais nova para a mais antiga. */
export interface GrupoMensagemListadasDto {
    grupoId: number;
    mensagens: MensagemDiretaResumoDto[];
    /** `null` quando não há página mais antiga. */
    proximoCursor: string | null;
}
