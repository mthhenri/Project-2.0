import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

export class AnotacaoListarDto {
  /** Dono do pad. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  usuarioId: number;

  /** Só estas seções (a IA carrega apenas o que precisa). Aceita `?tipos=FEITO,PESSOAL` ou repetido. Sem o campo, vêm as cinco. */
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.flatMap((item) => String(item).split(',')) : String(value).split(','),
  )
  @IsArray()
  @IsEnum(TipoAnotacaoEnum, { each: true })
  tipos?: TipoAnotacaoEnum[];
}
