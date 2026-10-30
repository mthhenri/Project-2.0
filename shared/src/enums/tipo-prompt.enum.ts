/** Tipos de prompt da IA (tabela `tipo_prompt`). A lista cresce por migration. */
export enum TipoPromptEnum {
  CONVERSA           = 'CONVERSA',
  CHECKIN            = 'CHECKIN',
  DESCRICAO_EXECUCAO = 'DESCRICAO_EXECUCAO',
  PAD                = 'PAD',
  PRIORIDADE         = 'PRIORIDADE',
  ENTREVISTA_DEMANDA = 'ENTREVISTA_DEMANDA',
  CONEXAO_DEMANDA    = 'CONEXAO_DEMANDA',
  DUVIDA_CODIGO      = 'DUVIDA_CODIGO',
  // Modo planejamento (task 234): a conversa do plano e, por tipo de texto, como escrever cada aba.
  PLANEJAMENTO            = 'PLANEJAMENTO',
  PLANO_DESCRICAO_TECNICA = 'PLANO_DESCRICAO_TECNICA',
  PLANO_DESCRICAO_CLIENTE = 'PLANO_DESCRICAO_CLIENTE',
  PLANO_DOCUMENTACAO      = 'PLANO_DOCUMENTACAO',
  // Tela de Documentações (task 260): alterar só a seleção de um texto da demanda, sem conversa.
  ALTERAR_TRECHO          = 'ALTERAR_TRECHO',
  // Relatório de execuções (task 270): a revisão por IA que aponta inconsistências nas execuções do período.
  REVISAO_RELATORIO       = 'REVISAO_RELATORIO',
}
