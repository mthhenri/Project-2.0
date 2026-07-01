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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

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
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
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

  @ApiPropertyOptional({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  @IsOptional()
  @IsEnum(TipoDemandaStatusEnum)
  status?: TipoDemandaStatusEnum;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isEstrutural?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;
}
