import { IsDateString, IsString, IsNotEmpty, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilCriarDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  diaData: string;

  @ApiProperty({ example: 'Natal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao: string;

  @ApiProperty({ enum: DiaNaoUtilTipoEnum })
  @IsEnum(DiaNaoUtilTipoEnum)
  tipo: DiaNaoUtilTipoEnum;

  @ApiProperty({ enum: DiaNaoUtilDuracaoEnum })
  @IsEnum(DiaNaoUtilDuracaoEnum)
  duracao: DiaNaoUtilDuracaoEnum;

  @ApiProperty({ example: true })
  @IsBoolean()
  recorrente: boolean;
}
