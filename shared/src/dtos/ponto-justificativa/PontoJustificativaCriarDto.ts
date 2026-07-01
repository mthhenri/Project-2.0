import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PontoJustificativaCriarDto {
  /** Usuário justificado. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  usuarioId: number;

  /** Dia justificado (`YYYY-MM-DD`). */
  @IsDateString()
  diaData: string;

  /** Título curto da justificativa. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nome: string;

  /** Motivo combinado — obrigatório para rastreabilidade do acordo gestor↔usuário. */
  @IsString()
  @IsNotEmpty()
  descricao: string;

  /** Horas do dia que **não** contam na meta; teto = jornada do usuário (validado no service). */
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  horasCobertas: number;
}
