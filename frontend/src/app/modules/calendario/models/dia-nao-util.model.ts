import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '@project20/shared';

export interface DiaNaoUtilTipoOpcao {
  label: string;
  value: TipoDiaNaoUtilEnum;
}

export interface DiaNaoUtilDuracaoOpcao {
  label: string;
  value: TipoDiaNaoUtilDuracaoEnum;
}

/** Resultado da verificação de dia útil retornado por `GET /calendario/verificar`. */
export interface VerificacaoDiaUtil {
  data: string;
  ehDiaUtil: boolean;
  motivo: string | null;
}

export const DIA_NAO_UTIL_TIPO_OPCOES: DiaNaoUtilTipoOpcao[] = [
  { label: 'Feriado',           value: TipoDiaNaoUtilEnum.FERIADO },
  { label: 'Recesso',           value: TipoDiaNaoUtilEnum.RECESSO },
  { label: 'Ponto Facultativo', value: TipoDiaNaoUtilEnum.PONTO_FACULTATIVO },
];

export const DIA_NAO_UTIL_DURACAO_OPCOES: DiaNaoUtilDuracaoOpcao[] = [
  { label: 'Integral',     value: TipoDiaNaoUtilDuracaoEnum.INTEGRAL },
  { label: 'Meio período', value: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO },
];

const ROTULO_POR_DURACAO: Record<TipoDiaNaoUtilDuracaoEnum, string> = {
  [TipoDiaNaoUtilDuracaoEnum.INTEGRAL]:     'Integral',
  [TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO]: 'Meio período',
};

export function rotuloDuracaoDiaNaoUtil(duracao: TipoDiaNaoUtilDuracaoEnum): string {
  return ROTULO_POR_DURACAO[duracao];
}

// Classe de marca (tom da primária) aplicada ao wrapper da tag de tipo na tabela.
// A diferenciação entre os tipos é por tonalidade do mesmo matiz do tema; os
// valores de cor ficam nos aliases --app-marca-* de styles.scss.
const CLASSE_TAG_POR_TIPO: Record<TipoDiaNaoUtilEnum, string> = {
  [TipoDiaNaoUtilEnum.FERIADO]:           'marca-tag marca-tag--feriado',
  [TipoDiaNaoUtilEnum.RECESSO]:           'marca-tag marca-tag--recesso',
  [TipoDiaNaoUtilEnum.PONTO_FACULTATIVO]: 'marca-tag marca-tag--facultativo',
};

const ROTULO_POR_TIPO: Record<TipoDiaNaoUtilEnum, string> = {
  [TipoDiaNaoUtilEnum.FERIADO]:           'Feriado',
  [TipoDiaNaoUtilEnum.RECESSO]:           'Recesso',
  [TipoDiaNaoUtilEnum.PONTO_FACULTATIVO]: 'Ponto Facultativo',
};

export function classeTagTipoDiaNaoUtil(tipo: TipoDiaNaoUtilEnum): string {
  return CLASSE_TAG_POR_TIPO[tipo];
}

export function rotuloTipoDiaNaoUtil(tipo: TipoDiaNaoUtilEnum): string {
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
