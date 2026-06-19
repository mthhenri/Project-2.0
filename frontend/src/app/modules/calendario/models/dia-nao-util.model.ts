import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '@project20/shared';

export type SeveridadeTag = 'secondary' | 'warn' | 'info' | 'success' | 'danger';

export interface DiaNaoUtilTipoOpcao {
  label: string;
  value: DiaNaoUtilTipoEnum;
}

export interface DiaNaoUtilDuracaoOpcao {
  label: string;
  value: DiaNaoUtilDuracaoEnum;
}

/** Resultado da verificação de dia útil retornado por `GET /calendario/verificar`. */
export interface VerificacaoDiaUtil {
  data: string;
  ehDiaUtil: boolean;
  motivo: string | null;
}

export const DIA_NAO_UTIL_TIPO_OPCOES: DiaNaoUtilTipoOpcao[] = [
  { label: 'Feriado',           value: DiaNaoUtilTipoEnum.FERIADO },
  { label: 'Recesso',           value: DiaNaoUtilTipoEnum.RECESSO },
  { label: 'Ponto Facultativo', value: DiaNaoUtilTipoEnum.PONTO_FACULTATIVO },
];

export const DIA_NAO_UTIL_DURACAO_OPCOES: DiaNaoUtilDuracaoOpcao[] = [
  { label: 'Integral',     value: DiaNaoUtilDuracaoEnum.INTEGRAL },
  { label: 'Meio período', value: DiaNaoUtilDuracaoEnum.MEIO_PERIODO },
];

const ROTULO_POR_DURACAO: Record<DiaNaoUtilDuracaoEnum, string> = {
  [DiaNaoUtilDuracaoEnum.INTEGRAL]:     'Integral',
  [DiaNaoUtilDuracaoEnum.MEIO_PERIODO]: 'Meio período',
};

export function rotuloDuracaoDiaNaoUtil(duracao: DiaNaoUtilDuracaoEnum): string {
  return ROTULO_POR_DURACAO[duracao];
}

const SEVERIDADE_POR_TIPO: Record<DiaNaoUtilTipoEnum, SeveridadeTag> = {
  [DiaNaoUtilTipoEnum.FERIADO]:           'danger',
  [DiaNaoUtilTipoEnum.RECESSO]:           'warn',
  [DiaNaoUtilTipoEnum.PONTO_FACULTATIVO]: 'info',
};

const ROTULO_POR_TIPO: Record<DiaNaoUtilTipoEnum, string> = {
  [DiaNaoUtilTipoEnum.FERIADO]:           'Feriado',
  [DiaNaoUtilTipoEnum.RECESSO]:           'Recesso',
  [DiaNaoUtilTipoEnum.PONTO_FACULTATIVO]: 'Ponto Facultativo',
};

export function severidadeTipoDiaNaoUtil(tipo: DiaNaoUtilTipoEnum): SeveridadeTag {
  return SEVERIDADE_POR_TIPO[tipo];
}

export function rotuloTipoDiaNaoUtil(tipo: DiaNaoUtilTipoEnum): string {
  return ROTULO_POR_TIPO[tipo];
}

/**
 * Converte um Date (vindo do p-datepicker) em string ISO date local `YYYY-MM-DD`,
 * usando os componentes locais para evitar deslocamento de fuso ao serializar.
 */
export function formatarDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Extrai ano/mês/dia (mês de 1 a 12) de uma data ISO vinda do backend.
 * Trata strings date-only (`YYYY-MM-DD`) como meio-dia local para evitar
 * o deslocamento de UTC à meia-noite — mesma estratégia do `data-brasileira.pipe`.
 */
export function partesDaData(valor: string): { ano: number; mes: number; dia: number } {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(valor + 'T12:00:00')
    : new Date(valor);
  return { ano: data.getFullYear(), mes: data.getMonth() + 1, dia: data.getDate() };
}
