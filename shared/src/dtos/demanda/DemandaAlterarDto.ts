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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaAlterarDto {
  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaPaiId?: number;

  @ApiPropertyOptional({ example: 'Implementar módulo de login' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nome?: string;

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

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  horasEstimadas?: number;

  @ApiPropertyOptional({ enum: DemandaPrioridadeEnum, example: DemandaPrioridadeEnum.MEDIA })
  @IsOptional()
  @IsEnum(DemandaPrioridadeEnum)
  prioridade?: DemandaPrioridadeEnum;

  @ApiPropertyOptional({ enum: DemandaStatusEnum, example: DemandaStatusEnum.EM_DESENVOLVIMENTO })
  @IsOptional()
  @IsEnum(DemandaStatusEnum)
  status?: DemandaStatusEnum;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isEstrutural?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ordemExibicao?: number;
}
