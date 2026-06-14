import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';

export class DemandaMembroDto {
  usuarioId: number;
  nomeCompleto: string;
  login: string;
  tipo: UsuarioTipoEnum;
  cargoTitulo: string;
}
