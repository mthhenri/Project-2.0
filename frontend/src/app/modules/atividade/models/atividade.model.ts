import { AtividadeStatusEnum } from '@project20/shared';

export type SeveridadeTag = 'secondary' | 'warn' | 'info' | 'success';

export interface AtividadeStatusOpcao {
  label: string;
  value: AtividadeStatusEnum | null;
}

export const ATIVIDADE_STATUS_OPCOES: AtividadeStatusOpcao[] = [
  { label: 'Pendente',      value: AtividadeStatusEnum.PENDENTE },
  { label: 'Planejada',     value: AtividadeStatusEnum.PLANEJADA },
  { label: 'Desenvolvendo', value: AtividadeStatusEnum.DESENVOLVENDO },
  { label: 'Desenvolvida',  value: AtividadeStatusEnum.DESENVOLVIDA },
];

export const ATIVIDADE_STATUS_FILTRO_OPCOES: AtividadeStatusOpcao[] = [
  { label: 'Todos', value: null },
  ...ATIVIDADE_STATUS_OPCOES,
];

/** Status considerados "em aberto" — exibidos por padrão na listagem (tudo exceto Desenvolvida). */
export const ATIVIDADE_STATUS_NAO_DESENVOLVIDA: AtividadeStatusEnum[] = [
  AtividadeStatusEnum.PLANEJADA,
  AtividadeStatusEnum.PENDENTE,
  AtividadeStatusEnum.DESENVOLVENDO,
];

const SEVERIDADE_POR_STATUS: Record<AtividadeStatusEnum, SeveridadeTag> = {
  [AtividadeStatusEnum.PLANEJADA]:     'secondary',
  [AtividadeStatusEnum.PENDENTE]:      'warn',
  [AtividadeStatusEnum.DESENVOLVENDO]: 'info',
  [AtividadeStatusEnum.DESENVOLVIDA]:  'success',
};

const ROTULO_POR_STATUS: Record<AtividadeStatusEnum, string> = {
  [AtividadeStatusEnum.PLANEJADA]:     'Planejada',
  [AtividadeStatusEnum.PENDENTE]:      'Pendente',
  [AtividadeStatusEnum.DESENVOLVENDO]: 'Desenvolvendo',
  [AtividadeStatusEnum.DESENVOLVIDA]:  'Desenvolvida',
};

export function severidadeStatusAtividade(status: AtividadeStatusEnum): SeveridadeTag {
  return SEVERIDADE_POR_STATUS[status];
}

export function rotuloStatusAtividade(status: AtividadeStatusEnum): string {
  return ROTULO_POR_STATUS[status];
}
