/** Situação de uma proposta da IA (tabela `tipo_proposta_ia_status`). `EXPIRADA` também é a proposta recusada. */
export enum StatusPropostaIaEnum {
  PENDENTE   = 'PENDENTE',
  CONFIRMADA = 'CONFIRMADA',
  AJUSTADA   = 'AJUSTADA',
  EXPIRADA   = 'EXPIRADA',
  DESFEITA   = 'DESFEITA',
}
