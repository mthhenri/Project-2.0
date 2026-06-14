import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';

export class DemandaUsuarioAtribuidoDto {
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  login: string;
  tipo: UsuarioTipoEnum;
}
