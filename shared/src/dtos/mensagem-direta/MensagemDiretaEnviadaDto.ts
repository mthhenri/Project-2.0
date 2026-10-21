import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';

/** A mensagem enviada, como ficou gravada. */
export interface MensagemDiretaEnviadaDto {
  mensagem: MensagemDiretaResumoDto;
  /** `true` quando o mesmo `mensagemId` já estava gravado: o reenvio devolve a mensagem que já existia e não duplica. */
  jaExistia: boolean;
}
