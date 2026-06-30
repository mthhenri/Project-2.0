import { TipoDemandaStatusEnum } from '@project20/shared';

export const COR_NO_PREENCHIMENTO: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  '#3a3f4b',
  [TipoDemandaStatusEnum.PLANEJADA]: '#0a3d58',
  [TipoDemandaStatusEnum.CONCLUIDA]: '#104a22',
};

export const COR_NO_BORDA: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  '#9ea8b8',
  [TipoDemandaStatusEnum.PLANEJADA]: '#22d3ee',
  [TipoDemandaStatusEnum.CONCLUIDA]: '#40e878',
};
