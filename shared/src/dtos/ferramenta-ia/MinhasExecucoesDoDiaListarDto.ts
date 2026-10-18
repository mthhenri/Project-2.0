import { IsOptional, Matches } from 'class-validator';

/** Entrada da ferramenta `listar_minhas_execucoes_do_dia`: o dia (`yyyy-mm-dd`, no fuso do sistema); sem ele, hoje. */
export class MinhasExecucoesDoDiaListarDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;
}
