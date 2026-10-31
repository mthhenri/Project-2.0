import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';
import { MensagemDiretaSupervisaoParticipanteDto } from './MensagemDiretaSupervisaoParticipanteDto';

/** Uma conversa entre desenvolvedores, para a lista da supervisão. */
export interface ConversaDiretaSupervisaoResumoDto {
  /** `<menorUsuarioId>-<maiorUsuarioId>`. */
  conversaId: string;
  participantes: MensagemDiretaSupervisaoParticipanteDto[];
  totalMensagens: number;
  ultimaMensagem: MensagemDiretaResumoDto;
}
