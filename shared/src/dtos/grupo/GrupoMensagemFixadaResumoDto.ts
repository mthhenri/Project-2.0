import { MensagemDiretaResumoDto } from '../mensagem-direta/MensagemDiretaResumoDto';

/** Uma mensagem fixada, com o texto que o armazenamento tem dela. */
export interface GrupoMensagemFixadaResumoDto {
    mensagem: MensagemDiretaResumoDto;
    fixadaPorUsuarioId: number;
    fixadaDate: Date;
}
