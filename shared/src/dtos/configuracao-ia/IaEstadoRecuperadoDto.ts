import { EstadoIaEnum } from '../../enums/estado-ia.enum';

/** Estado da IA em tempo real (em memória no backend). */
export interface IaEstadoRecuperadoDto {
  estado: EstadoIaEnum;
}
