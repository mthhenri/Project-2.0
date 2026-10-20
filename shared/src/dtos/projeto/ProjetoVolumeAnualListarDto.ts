import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** O ano da visão anual do volume (task 199), no fuso do sistema. */
export class ProjetoVolumeAnualListarDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano: number;
}
