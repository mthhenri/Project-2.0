import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';

/** Uma página da conversa com uma pessoa. */
export interface MensagemDiretaListadasDto {
  /** Da mais nova para a mais antiga. */
  mensagens: MensagemDiretaResumoDto[];
  /** Para pedir a página seguinte (mais antiga); `null` quando não há mais mensagens. */
  proximoCursor: string | null;
  /** Até onde a outra pessoa leu (a data da última mensagem que ela viu); é dele que sai o "Lida". `null` se ainda não leu nada. */
  lidaAteDate: Date | null;
}
