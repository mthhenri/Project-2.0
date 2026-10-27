import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/**
 * Entrada da ferramenta `aprofundar_analise_do_plano` (conversa do planejamento, que roda no nível padrão): o plano e o que o modelo mais forte deve
 * analisar ou redigir. O complemento `Analise` precede o verbo.
 */
export class PlanoAnaliseAprofundarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  pedido: string;
}
