/** Seções do pad de cada usuário (tabela `tipo_anotacao`), na ordem de exibição. */
export enum TipoAnotacaoEnum {
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  FEITO        = 'FEITO',
  PENDENCIA    = 'PENDENCIA',
  LEMBRETE     = 'LEMBRETE',
  PESSOAL      = 'PESSOAL',
}

export const TIPOS_ANOTACAO_ORDENADOS: readonly TipoAnotacaoEnum[] = [
  TipoAnotacaoEnum.EM_ANDAMENTO,
  TipoAnotacaoEnum.FEITO,
  TipoAnotacaoEnum.PENDENCIA,
  TipoAnotacaoEnum.LEMBRETE,
  TipoAnotacaoEnum.PESSOAL,
];
