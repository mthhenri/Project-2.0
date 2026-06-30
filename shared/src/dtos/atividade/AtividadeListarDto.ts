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
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

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
  @IsEnum(TipoAtividadeStatusEnum, { each: true })
  status?: TipoAtividadeStatusEnum[];

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
