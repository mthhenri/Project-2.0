import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

export const MODOS_DE_ESCRITA_NO_PLANO = ['SUBSTITUIR', 'ACRESCENTAR'] as const;
export type ModoDeEscritaNoPlano = (typeof MODOS_DE_ESCRITA_NO_PLANO)[number];

/**
 * Entrada da ferramenta `escrever_no_plano` (conversa do planejamento): escreve direto no **rascunho** de uma aba. `SUBSTITUIR` troca o texto
 * da aba inteiro; `ACRESCENTAR` põe o texto no fim. `versao` é a que a IA leu: se alguém gravou depois, a escrita é recusada e ela relê.
 */
export class PlanoEscreverDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  @IsEnum(PlanoAbaEnum)
  aba: PlanoAbaEnum;

  @IsIn(MODOS_DE_ESCRITA_NO_PLANO)
  modo: ModoDeEscritaNoPlano;

  /** O texto em Markdown. */
  @IsString()
  @MaxLength(30000)
  texto: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  versao: number;
}
