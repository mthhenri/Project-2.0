import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

/**
 * Entrada da ferramenta `propor_alterar_trecho_do_plano`: troca **só um trecho** que a pessoa selecionou. `trechoAntigo` é copiado exatamente do
 * texto da aba (e aparece uma vez só nele); `trechoNovo` o substitui. Nada é gravado antes de a pessoa aceitar.
 */
export class ProporAlterarTrechoPlanoDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  @IsEnum(PlanoAbaEnum)
  aba: PlanoAbaEnum;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  trechoAntigo: string;

  @IsString()
  @MaxLength(20000)
  trechoNovo: string;
}
