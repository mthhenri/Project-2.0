import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoUsuarioStatusEnum } from '../../enums/tipo-usuario-status.enum';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class UsuarioAlterarDto {
  @ApiPropertyOptional({ example: 'joao.silva' })
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
  @IsOptional()
  @IsString()
  @MinLength(4)
  login?: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nomeCompleto?: string;

  @ApiPropertyOptional({ example: 'Tech Lead' })
  @IsOptional()
  @IsString()
  cargoTitulo?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  horasDiariasNecessarias?: number;

  @ApiPropertyOptional({ enum: TipoUsuarioStatusEnum, example: TipoUsuarioStatusEnum.ATIVO })
  @IsOptional()
  @IsEnum(TipoUsuarioStatusEnum)
  status?: TipoUsuarioStatusEnum;

  @ApiPropertyOptional({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.GESTOR })
  @IsOptional()
  @IsEnum(TipoUsuarioEnum)
  tipo?: TipoUsuarioEnum;
}
