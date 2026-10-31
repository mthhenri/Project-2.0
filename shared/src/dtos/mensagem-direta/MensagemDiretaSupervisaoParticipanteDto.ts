import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Uma das pessoas de uma conversa supervisionada. */
export interface MensagemDiretaSupervisaoParticipanteDto {
  usuarioId: number;
  usuarioNome: string;
  tipo: TipoUsuarioEnum;
}
