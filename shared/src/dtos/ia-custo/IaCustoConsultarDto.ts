import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** O recorte da aba "Custos": um mês (`ano` e `mes`) ou o ano inteiro (sem `mes`), no fuso do sistema. */
export class IaCustoConsultarDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano: number;

  @ApiProperty({ example: 10, required: false, description: '1 a 12; sem o campo, o ano inteiro' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
