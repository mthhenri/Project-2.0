import { IsDateString, IsString, IsNotEmpty, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilCriarDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  diaData: string;

  @ApiProperty({ example: 'Natal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao: string;

  @ApiProperty({ enum: TipoDiaNaoUtilEnum })
  @IsEnum(TipoDiaNaoUtilEnum)
  tipo: TipoDiaNaoUtilEnum;

  @ApiProperty({ enum: TipoDiaNaoUtilDuracaoEnum })
  @IsEnum(TipoDiaNaoUtilDuracaoEnum)
  duracao: TipoDiaNaoUtilDuracaoEnum;

  @ApiProperty({ example: true })
  @IsBoolean()
  recorrente: boolean;
}
