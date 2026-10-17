import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Edição pontual: troca um trecho por outro dentro da seção, sem reescrevê-la. O trecho antigo precisa aparecer uma única vez. */
export class AnotacaoTrechoTrocarDto {
  @IsString()
  @IsNotEmpty()
  trechoAntigo: string;

  @IsString()
  trechoNovo: string;

  /** Opcional: com ele, a troca só vale se a seção não mudou desde a leitura. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedDateLido?: Date;
}
