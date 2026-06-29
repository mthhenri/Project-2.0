import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';

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

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds?: number[];

  @ApiPropertyOptional({ example: [3, 4], description: 'Membros adicionais a atribuir na criação (gestor-only).' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  usuarioIds?: number[];
}
