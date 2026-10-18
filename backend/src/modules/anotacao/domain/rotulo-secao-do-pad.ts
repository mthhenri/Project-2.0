import { TipoAnotacaoEnum } from '@project20/shared';

/** Nome de cada seção do pad como a tela mostra (a IA e os cartões usam o mesmo). */
export const ROTULO_SECAO_DO_PAD: Record<TipoAnotacaoEnum, string> = {
  [TipoAnotacaoEnum.EM_ANDAMENTO]: 'Em andamento',
  [TipoAnotacaoEnum.FEITO]: 'Feito',
  [TipoAnotacaoEnum.PENDENCIA]: 'Pendências',
  [TipoAnotacaoEnum.LEMBRETE]: 'Lembretes',
  [TipoAnotacaoEnum.PESSOAL]: 'Pessoal',
};
