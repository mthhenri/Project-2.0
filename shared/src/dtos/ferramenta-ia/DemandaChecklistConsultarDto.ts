import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_checklist_da_demanda`: a demanda (o id vem de `listar_minhas_demandas`). */
export class DemandaChecklistConsultarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;
}
