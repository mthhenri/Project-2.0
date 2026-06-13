import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioRecuperadoDto {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoTitulo: string;
  anotacoes: string | null;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
  horasDiariasNecessarias: number;
  createdDate: Date;
}
