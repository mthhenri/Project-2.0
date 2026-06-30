import { TipoUsuarioStatusEnum } from '../../enums/tipo-usuario-status.enum';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class UsuarioInternoAlterarDto {
  id: number;
  nomeCompleto?: string;
  cargoTitulo?: string;
  anotacoes?: string;
  horasDiariasNecessarias?: number;
  status?: TipoUsuarioStatusEnum;
  tipo?: TipoUsuarioEnum;
}
