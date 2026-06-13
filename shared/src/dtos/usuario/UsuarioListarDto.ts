import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioListarDto {
  @ApiPropertyOptional({ enum: UsuarioTipoEnum, example: UsuarioTipoEnum.DESENVOLVEDOR })
  @IsOptional()
  @IsEnum(UsuarioTipoEnum)
  tipo?: UsuarioTipoEnum;

  @ApiPropertyOptional({ enum: UsuarioStatusEnum, example: UsuarioStatusEnum.ATIVO })
  @IsOptional()
  @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  itensPorPagina?: number;
}
