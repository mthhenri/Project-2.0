import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Define (ou troca) o preço de um modelo, em dólares por milhão de tokens. Só o administrador. */
export class IaModeloPrecoAlterarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  modelo: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100000)
  precoEntradaMilhao: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100000)
  precoSaidaMilhao: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100000)
  precoCacheMilhao: number;
}
