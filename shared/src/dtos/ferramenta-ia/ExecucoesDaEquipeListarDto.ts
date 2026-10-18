import { IsOptional, Matches } from 'class-validator';

/** Entrada da ferramenta `listar_execucoes_da_equipe_no_dia` (gestor): o dia (`yyyy-mm-dd`); sem ele, hoje. */
export class ExecucoesDaEquipeListarDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;
}

/** Uma execução de uma pessoa da equipe. */
export interface ExecucaoDaPessoaDto {
  atividade: string;
  demanda: string;
  projeto: string;
  descricao: string;
  /** ISO 8601. */
  inicio: string;
  /** ISO 8601; `null` em andamento. */
  fim: string | null;
  minutos: number | null;
}

/** O que uma pessoa fez no dia. */
export interface PessoaDaEquipeDto {
  usuarioId: number;
  usuario: string;
  totalMinutos: number;
  execucoes: ExecucaoDaPessoaDto[];
}

/** O que a ferramenta `listar_execucoes_da_equipe_no_dia` devolve à IA. */
export interface ExecucoesDaEquipeListadasDto {
  data: string;
  pessoas: PessoaDaEquipeDto[];
  totalExecucoes: number;
  haMais: boolean;
}
