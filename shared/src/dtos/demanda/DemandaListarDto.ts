import { IsNumber, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

export class DemandaListarDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  projetoId: number;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  demandaPaiId?: number;

  @ApiPropertyOptional({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  @IsOptional()
  @IsEnum(TipoDemandaStatusEnum)
  status?: TipoDemandaStatusEnum;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isEstrutural?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pagina?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  itensPorPagina?: number;

  @ApiPropertyOptional({ example: true, description: 'Quando true, ignora a paginação e retorna todos os registros' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allRows?: boolean;
}
