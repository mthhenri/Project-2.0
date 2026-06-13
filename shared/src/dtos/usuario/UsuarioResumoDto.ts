import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioResumoDto {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoTitulo: string;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
}
