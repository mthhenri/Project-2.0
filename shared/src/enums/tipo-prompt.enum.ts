/** Tipos de prompt da IA (tabela `tipo_prompt`). A lista cresce por migration. */
export enum TipoPromptEnum {
  CONVERSA           = 'CONVERSA',
  CHECKIN            = 'CHECKIN',
  DESCRICAO_EXECUCAO = 'DESCRICAO_EXECUCAO',
  PAD                = 'PAD',
  PRIORIDADE         = 'PRIORIDADE',
  ENTREVISTA_DEMANDA = 'ENTREVISTA_DEMANDA',
  CONEXAO_DEMANDA    = 'CONEXAO_DEMANDA',
}
