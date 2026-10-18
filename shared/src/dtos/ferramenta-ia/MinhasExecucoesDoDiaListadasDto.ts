/** Uma execução do dia como a IA a lê. */
export interface MinhaExecucaoResumoDto {
  id: number;
  atividade: string;
  demanda: string;
  projeto: string;
  descricao: string;
  /** ISO 8601. */
  inicio: string;
  /** `null` na execução em andamento. */
  fim: string | null;
  minutos: number | null;
}

/** O que a ferramenta `listar_minhas_execucoes_do_dia` devolve à IA. */
export interface MinhasExecucoesDoDiaListadasDto {
  /** `yyyy-mm-dd` no fuso do sistema. */
  data: string;
  execucoes: MinhaExecucaoResumoDto[];
  totalMinutos: number;
  total: number;
  haMais: boolean;
}
