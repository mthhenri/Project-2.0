import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioListarDto {
  @IsOptional()
  @IsEnum(UsuarioTipoEnum)
  tipo?: UsuarioTipoEnum;

  @IsOptional()
  @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  itensPorPagina?: number;
}
