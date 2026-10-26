import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsPositive } from 'class-validator';

export class PlanoProjetoAtribuirDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  projetoId: number;

  /** O plano amplo passa a ser visto pelo projeto e não volta a ser pessoal: a API exige a confirmação explícita. */
  @IsBoolean()
  confirmado: boolean;
}
