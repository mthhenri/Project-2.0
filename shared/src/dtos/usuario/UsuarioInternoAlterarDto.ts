import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';

export class UsuarioInternoAlterarDto {
  id: number;
  nomeCompleto?: string;
  cargoTitulo?: string;
  anotacoes?: string;
  horasDiariasNecessarias?: number;
  status?: UsuarioStatusEnum;
  tipo?: UsuarioTipoEnum;
}
