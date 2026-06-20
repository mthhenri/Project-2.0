import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioInternoAlterarDto {
  id: number;
  nomeCompleto?: string;
  cargoTitulo?: string;
  anotacoes?: string;
  horasDiariasNecessarias?: number;
  status?: UsuarioStatusEnum;
}
