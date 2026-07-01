import { BaseEntity } from '../../../../core/base/base.entity';

export class PontoJustificativa extends BaseEntity {
  usuarioId: number;
  gestorId: number;
  diaData: Date;
  nome: string;
  descricao: string;
  horasCobertas: number;
}
