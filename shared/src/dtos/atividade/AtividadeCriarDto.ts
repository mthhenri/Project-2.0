import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class AtividadeCriarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsEnum(TipoAtividadeStatusEnum)
  status: TipoAtividadeStatusEnum;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds?: number[];
}
