import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class DemandaUsuarioAtribuidoDto {
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  login: string;
  tipo: TipoUsuarioEnum;
}
