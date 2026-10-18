import { dataDoBancoComoTexto } from '../../../core/utils/data-do-banco';

/** Um dia não útil cadastrado; os `recorrente` valem todo ano no mesmo mês e dia. `diaData` vem do banco como `Date` (coluna `DATE`). */
export interface DiaNaoUtilCadastrado {
  diaData: string | Date;
  recorrente: boolean;
}

/** Cada ocorrência (com a data do ano em questão) dentro de `dataInicio`..`dataFim` (`yyyy-mm-dd`, inclusive), em ordem de data. */
export function ocorrenciasNoIntervalo<T extends DiaNaoUtilCadastrado>(
  cadastrados: readonly T[],
  dataInicio: string,
  dataFim: string,
): { data: string; dia: T }[] {
  const anoInicio = Number(dataInicio.slice(0, 4));
  const anoFim = Number(dataFim.slice(0, 4));
  const ocorrencias: { data: string; dia: T }[] = [];
  for (const dia of cadastrados) {
    const cadastrado = dataDoBancoComoTexto(dia.diaData);
    if (!cadastrado) continue;
    if (!dia.recorrente) {
      if (cadastrado >= dataInicio && cadastrado <= dataFim) ocorrencias.push({ data: cadastrado, dia });
      continue;
    }
    for (let ano = anoInicio; ano <= anoFim; ano++) {
      const data = `${ano}${cadastrado.slice(4)}`;
      if (data >= dataInicio && data <= dataFim) ocorrencias.push({ data, dia });
    }
  }
  return ocorrencias.sort((a, b) => a.data.localeCompare(b.data));
}
