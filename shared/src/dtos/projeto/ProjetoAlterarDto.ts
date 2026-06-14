import { IsOptional, IsString, MinLength, Matches, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjetoStatusEnum } from '../../enums/projeto-status.enum';

export class ProjetoAlterarDto {
  @ApiPropertyOptional({ example: 'Sistema de Gestão v2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor?: string;

  @ApiPropertyOptional({ enum: ProjetoStatusEnum })
  @IsOptional()
  @IsEnum(ProjetoStatusEnum)
  status?: ProjetoStatusEnum;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  inicioData?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;
}
