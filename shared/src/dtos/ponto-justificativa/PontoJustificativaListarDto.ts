import { Type } from 'class-transformer';
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class PontoJustificativaListarDto {
  /** Usuário cujas justificativas serão listadas. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  usuarioId: number;

  @IsInt()
  @Min(2000)
  @Type(() => Number)
  ano: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes: number;
}
