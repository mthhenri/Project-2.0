import { IsOptional, IsString, IsNotEmpty, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilAlterarDto {
  @ApiPropertyOptional({ example: 'Natal' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao?: string;

  @ApiPropertyOptional({ enum: TipoDiaNaoUtilEnum })
  @IsOptional()
  @IsEnum(TipoDiaNaoUtilEnum)
  tipo?: TipoDiaNaoUtilEnum;

  @ApiPropertyOptional({ enum: TipoDiaNaoUtilDuracaoEnum })
  @IsOptional()
  @IsEnum(TipoDiaNaoUtilDuracaoEnum)
  duracao?: TipoDiaNaoUtilDuracaoEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;
}
