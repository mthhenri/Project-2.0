import { TipoAtividadeStatusEnum } from '@project20/shared';

export type SeveridadeTag = 'secondary' | 'warn' | 'info' | 'success';

export interface AtividadeStatusOpcao {
  label: string;
  value: TipoAtividadeStatusEnum | null;
}

export const ATIVIDADE_STATUS_OPCOES: AtividadeStatusOpcao[] = [
  { label: 'Pendente',      value: TipoAtividadeStatusEnum.PENDENTE },
  { label: 'Planejada',     value: TipoAtividadeStatusEnum.PLANEJADA },
  { label: 'Desenvolvendo', value: TipoAtividadeStatusEnum.DESENVOLVENDO },
  { label: 'Desenvolvida',  value: TipoAtividadeStatusEnum.DESENVOLVIDA },
];

export const ATIVIDADE_STATUS_FILTRO_OPCOES: AtividadeStatusOpcao[] = [
  { label: 'Todos', value: null },
  ...ATIVIDADE_STATUS_OPCOES,
];

/** Status considerados "em aberto" — exibidos por padrão na listagem (tudo exceto Desenvolvida). */
export const ATIVIDADE_STATUS_NAO_DESENVOLVIDA: TipoAtividadeStatusEnum[] = [
  TipoAtividadeStatusEnum.PLANEJADA,
  TipoAtividadeStatusEnum.PENDENTE,
  TipoAtividadeStatusEnum.DESENVOLVENDO,
];

/** Status em que se pode INICIAR uma execução (botão de play); fora deles só resta encerrar. */
export const ATIVIDADE_STATUS_EXECUTAVEL: TipoAtividadeStatusEnum[] = [
  TipoAtividadeStatusEnum.PLANEJADA,
  TipoAtividadeStatusEnum.DESENVOLVENDO,
];

const SEVERIDADE_POR_STATUS: Record<TipoAtividadeStatusEnum, SeveridadeTag> = {
  [TipoAtividadeStatusEnum.PLANEJADA]:     'secondary',
  [TipoAtividadeStatusEnum.PENDENTE]:      'warn',
  [TipoAtividadeStatusEnum.DESENVOLVENDO]: 'info',
  [TipoAtividadeStatusEnum.DESENVOLVIDA]:  'success',
};

const ROTULO_POR_STATUS: Record<TipoAtividadeStatusEnum, string> = {
  [TipoAtividadeStatusEnum.PLANEJADA]:     'Planejada',
  [TipoAtividadeStatusEnum.PENDENTE]:      'Pendente',
  [TipoAtividadeStatusEnum.DESENVOLVENDO]: 'Desenvolvendo',
  [TipoAtividadeStatusEnum.DESENVOLVIDA]:  'Desenvolvida',
};

export function severidadeStatusAtividade(status: TipoAtividadeStatusEnum): SeveridadeTag {
  return SEVERIDADE_POR_STATUS[status];
}

export function rotuloStatusAtividade(status: TipoAtividadeStatusEnum): string {
  return ROTULO_POR_STATUS[status];
}
