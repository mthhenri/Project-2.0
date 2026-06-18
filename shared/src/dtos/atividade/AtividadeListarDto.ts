import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeListarDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(AtividadeStatusEnum, { each: true })
  status?: AtividadeStatusEnum[];

  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pagina?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  itensPorPagina?: number;
}
