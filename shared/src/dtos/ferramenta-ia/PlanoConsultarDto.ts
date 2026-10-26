import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_plano` (conversa do planejamento): o plano cujo documento a IA quer reler, com a versão de agora. */
export class PlanoConsultarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;
}
