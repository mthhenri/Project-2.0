/** Uma atividade do usuário como a IA a lê: resumida, já na ordem de prioridade. */
export interface MinhaAtividadeResumoDto {
  id: number;
  nome: string;
  status: string;
  /** Nome da prioridade (Urgente, Alta, Média, Baixa ou Indefinida). */
  prioridade: string;
  /** O id da demanda: é o que `propor_criar_atividade` pede. */
  demandaId: number;
  demanda: string;
  projeto: string;
  /** Há uma execução em andamento nesta atividade. */
  emExecucao: boolean;
  minutosExecutados: number;
}

/** O que a ferramenta `listar_minhas_atividades` devolve à IA. */
export interface MinhasAtividadesListadasDto {
  atividades: MinhaAtividadeResumoDto[];
  /** Quantas atividades existem no filtro (pode ser mais que as listadas). */
  total: number;
  haMais: boolean;
}
