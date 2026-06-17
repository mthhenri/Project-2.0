import { DemandaStatusEnum } from '@project20/shared';

export const COR_NO_PREENCHIMENTO: Record<DemandaStatusEnum, string> = {
  [DemandaStatusEnum.PENDENTE]:  '#3a3f4b',
  [DemandaStatusEnum.PLANEJADA]: '#0a3d58',
  [DemandaStatusEnum.CONCLUIDA]: '#104a22',
};

export const COR_NO_BORDA: Record<DemandaStatusEnum, string> = {
  [DemandaStatusEnum.PENDENTE]:  '#9ea8b8',
  [DemandaStatusEnum.PLANEJADA]: '#22d3ee',
  [DemandaStatusEnum.CONCLUIDA]: '#40e878',
};
