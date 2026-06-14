import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeListarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsOptional()
  @IsEnum(AtividadeStatusEnum)
  status?: AtividadeStatusEnum;

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
