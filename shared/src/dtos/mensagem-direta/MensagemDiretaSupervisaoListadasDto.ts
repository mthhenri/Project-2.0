import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';
import { MensagemDiretaSupervisaoParticipanteDto } from './MensagemDiretaSupervisaoParticipanteDto';

/** Uma página de uma conversa de terceiros aberta na supervisão, da mais nova para a mais antiga. */
export interface MensagemDiretaSupervisaoListadasDto {
  conversaId: string;
  participantes: MensagemDiretaSupervisaoParticipanteDto[];
  mensagens: MensagemDiretaResumoDto[];
  /** `null` quando não há página mais antiga. */
  proximoCursor: string | null;
  /** Esta abertura gerou o aviso aos participantes (no máximo um por leitor, conversa e dia). */
  participantesAvisados: boolean;
}
