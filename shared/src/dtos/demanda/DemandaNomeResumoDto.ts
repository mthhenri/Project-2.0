import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

/** Uma demanda achada pelo nome. */
export interface DemandaNomeResumoDto {
  id: number;
  projetoId: number;
  nome: string;
  status: TipoDemandaStatusEnum;
}
