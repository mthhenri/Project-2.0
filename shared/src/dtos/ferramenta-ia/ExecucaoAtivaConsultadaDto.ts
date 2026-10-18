/** O que a ferramenta `consultar_execucao_ativa` devolve à IA. */
export interface ExecucaoAtivaConsultadaDto {
  ativa: boolean;
  execucaoId?: number;
  /** Quando o gestor consultou outra pessoa: o nome dela. */
  usuario?: string;
  atividade?: string;
  demanda?: string;
  projeto?: string;
  /** A descrição provisória da execução, a que vale até o check-in. */
  descricao?: string;
  /** Instante do início, ISO 8601. */
  inicio?: string;
  minutosAteAgora?: number;
}
