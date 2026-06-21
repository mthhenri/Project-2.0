import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';

export class UsuarioAlterarDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nomeCompleto?: string;

  @ApiPropertyOptional({ example: 'Tech Lead' })
  @IsOptional()
  @IsString()
  cargoTitulo?: string;

  @ApiPropertyOptional({ example: 'Responsável pelo módulo de autenticação.' })
  @IsOptional()
  @IsString()
  anotacoes?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  horasDiariasNecessarias?: number;

  @ApiPropertyOptional({ enum: UsuarioStatusEnum, example: UsuarioStatusEnum.ATIVO })
  @IsOptional()
  @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;

  @ApiPropertyOptional({ enum: UsuarioTipoEnum, example: UsuarioTipoEnum.GESTOR })
  @IsOptional()
  @IsEnum(UsuarioTipoEnum)
  tipo?: UsuarioTipoEnum;
}
