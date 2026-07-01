import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoProjetoStatusEnum } from '../../enums/tipo-projeto-status.enum';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class ProjetoCriarDto {
  @ApiProperty({ example: 'Sistema de Gestão' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  @ApiProperty({ example: 'PROJ-001' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @ApiProperty({ example: '#6366f1' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor: string;

  @ApiProperty({ enum: TipoProjetoStatusEnum, example: TipoProjetoStatusEnum.ATIVO })
  @IsEnum(TipoProjetoStatusEnum)
  status: TipoProjetoStatusEnum;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  inicioData?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;
}
