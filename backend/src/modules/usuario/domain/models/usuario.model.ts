import { BaseEntity } from '../../../../core/base/base.entity';
import { UsuarioTipoEnum, UsuarioStatusEnum } from '@project20/shared';

export class Usuario extends BaseEntity {
  login: string;
  senhaEncriptada: string;
  nomeCompleto: string;
  cargoTitulo: string;
  anotacoes: string | null;
  anotacoesAlteracaoData: Date | null;
  horasDiariasNecessarias: number;
  tipo: UsuarioTipoEnum;
  status: UsuarioStatusEnum;
}
