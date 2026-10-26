/** Uma atividade (um bloco do trabalho) do checklist da demanda, como a IA a lê. */
export interface DemandaChecklistAtividadeDto {
  id: number;
  nome: string;
  status: string;
  /** Dono da atividade. */
  usuario: string;
  minutosExecutados: number;
  totalExecucoes: number;
  /** Há execução em andamento nesta atividade. */
  emExecucao: boolean;
}

/** O que a ferramenta `consultar_checklist_da_demanda` devolve à IA: só as atividades, sem as descrições da demanda. */
export interface DemandaChecklistConsultadoDto {
  demandaId: number;
  demanda: string;
  atividades: DemandaChecklistAtividadeDto[];
  total: number;
  haMais: boolean;
}
