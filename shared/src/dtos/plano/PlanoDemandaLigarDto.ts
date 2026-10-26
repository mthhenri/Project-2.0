import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class PlanoDemandaLigarDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  demandaId: number;
}
