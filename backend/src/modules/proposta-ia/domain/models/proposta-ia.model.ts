import { BaseEntity } from '../../../../core/base/base.entity';
import { StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';

/** Uma ação que a IA propôs ao usuário e que só roda quando ele confirma. */
export interface PropostaIa extends BaseEntity {
  usuarioId: number;
  tipo: TipoPropostaIaEnum;
  status: StatusPropostaIaEnum;
  dados: Record<string, unknown>;
  resultado: Record<string, unknown> | null;
  resolucaoData: Date | null;
  aplicadaPelaIa: boolean;
}
