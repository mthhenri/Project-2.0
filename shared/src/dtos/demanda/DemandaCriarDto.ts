import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaCriarDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  projetoId: number;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaPaiId?: number;

  @ApiProperty({ example: 'Implementar módulo de login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({ example: 'Implementar autenticação JWT com refresh token' })
  @IsOptional()
  @IsString()
  descricaoTecnica?: string;

  @ApiPropertyOptional({ example: 'O usuário deve poder entrar no sistema com email e senha' })
  @IsOptional()
  @IsString()
  descricaoCliente?: string;

  @ApiPropertyOptional({ example: '# Documentação\n\nDescrição detalhada...' })
  @IsOptional()
  @IsString()
  documentacao?: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  horasEstimadas: number;

  @ApiProperty({ enum: DemandaPrioridadeEnum, example: DemandaPrioridadeEnum.MEDIA })
  @IsEnum(DemandaPrioridadeEnum)
  prioridade: DemandaPrioridadeEnum;

  @ApiProperty({ enum: DemandaStatusEnum, example: DemandaStatusEnum.PLANEJADA })
  @IsEnum(DemandaStatusEnum)
  status: DemandaStatusEnum;

  @ApiProperty({ example: false })
  @IsBoolean()
  isEstrutural: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ordemExibicao: number;
}
