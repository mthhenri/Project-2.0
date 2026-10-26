import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

export class PlanoPublicarDto {
  /** Versão do plano que a pessoa viu no diff; o plano mudou depois, a publicação é recusada (409). */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  versao: number;

  /** Os textos a gravar na demanda ligada. A descrição do cliente só passa para gestor e administrador. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(PlanoAbaEnum, { each: true })
  abas: PlanoAbaEnum[];

  /** Abas cujo texto vazio no plano apaga o da demanda; sem estar aqui, texto vazio não apaga o da demanda. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PlanoAbaEnum, { each: true })
  abasParaApagar?: PlanoAbaEnum[];
}
