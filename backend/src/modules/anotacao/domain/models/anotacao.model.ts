import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoAnotacaoEnum } from '@project20/shared';

/** Uma seção do pad de um usuário. */
export interface Anotacao extends BaseEntity {
  usuarioId: number;
  tipo: TipoAnotacaoEnum;
  texto: string;
}
