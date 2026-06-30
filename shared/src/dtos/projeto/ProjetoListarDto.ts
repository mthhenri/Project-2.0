import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoProjetoStatusEnum } from '../../enums/tipo-projeto-status.enum';

export class ProjetoListarDto {
  @ApiPropertyOptional({ enum: TipoProjetoStatusEnum })
  @IsOptional()
  @IsEnum(TipoProjetoStatusEnum)
  status?: TipoProjetoStatusEnum;

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
