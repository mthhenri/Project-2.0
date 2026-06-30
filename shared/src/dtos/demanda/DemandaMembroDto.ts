import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class DemandaMembroDto {
  usuarioId: number;
  nomeCompleto: string;
  login: string;
  tipo: TipoUsuarioEnum;
  cargoTitulo: string;
}
