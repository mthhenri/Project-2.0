import { MensagemDiretaSupervisaoParticipanteDto } from './MensagemDiretaSupervisaoParticipanteDto';

/** Uma conversa entre desenvolvedores, para a lista da supervisão. */
export interface ConversaDiretaSupervisaoResumoDto {
    /** `<menorUsuarioId>-<maiorUsuarioId>`. */
    conversaId: string;
    participantes: MensagemDiretaSupervisaoParticipanteDto[];
    totalMensagens: number;
    /** Quando foi a última mensagem (que casa com o filtro). O texto não vem na lista: ler o conteúdo é abrir a conversa, que é auditada. */
    ultimaMensagemData: Date;
}
