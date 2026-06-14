import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjetoStatusEnum } from '../../enums/projeto-status.enum';

export class ProjetoListarDto {
  @ApiPropertyOptional({ enum: ProjetoStatusEnum })
  @IsOptional()
  @IsEnum(ProjetoStatusEnum)
  status?: ProjetoStatusEnum;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  itensPorPagina?: number = 20;
}
