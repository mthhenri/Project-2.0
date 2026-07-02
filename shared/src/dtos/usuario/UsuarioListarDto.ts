import { IsOptional, IsEnum, IsNumber, IsString, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';
import { TipoUsuarioStatusEnum } from '../../enums/tipo-usuario-status.enum';

export class UsuarioListarDto {
  @ApiPropertyOptional({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.DESENVOLVEDOR })
  @IsOptional()
  @IsEnum(TipoUsuarioEnum)
  tipo?: TipoUsuarioEnum;

  @ApiPropertyOptional({ enum: TipoUsuarioStatusEnum, example: TipoUsuarioStatusEnum.ATIVO })
  @IsOptional()
  @IsEnum(TipoUsuarioStatusEnum)
  status?: TipoUsuarioStatusEnum;

  @ApiPropertyOptional({ example: 'joão' })
  @IsOptional()
  @IsString()
  busca?: string;

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

  @ApiPropertyOptional({ example: true, description: 'Quando true, ignora a paginação e retorna todos os registros' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allRows?: boolean;
}
