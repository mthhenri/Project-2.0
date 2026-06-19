import { IsOptional, IsString, IsNotEmpty, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilAlterarDto {
  @ApiPropertyOptional({ example: 'Natal' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao?: string;

  @ApiPropertyOptional({ enum: DiaNaoUtilTipoEnum })
  @IsOptional()
  @IsEnum(DiaNaoUtilTipoEnum)
  tipo?: DiaNaoUtilTipoEnum;

  @ApiPropertyOptional({ enum: DiaNaoUtilDuracaoEnum })
  @IsOptional()
  @IsEnum(DiaNaoUtilDuracaoEnum)
  duracao?: DiaNaoUtilDuracaoEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;
}
