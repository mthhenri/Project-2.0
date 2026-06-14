import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeCriarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsEnum(AtividadeStatusEnum)
  status: AtividadeStatusEnum;

  @IsNumber()
  @Min(0)
  ordemExibicao: number;
}
