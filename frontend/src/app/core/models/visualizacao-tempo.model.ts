/** Horas equivalentes a um dia de trabalho, base da conversão horas ↔ dias. */
export const HORAS_POR_DIA = 8;

/** Chave da preferência (exibir tempos de demanda em dias) no `localStorage`. */
export const VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE = 'preferencia.tempo-em-dias';

/** Unidade em que o valor de entrada está expresso. */
export type UnidadeTempoEntrada = 'horas' | 'minutos';

/**
 * Formata um tempo de trabalho (de demanda ou atividade) para exibição. No modo horas
 * reproduz o formato atual (`"{h}h"` para horas inteiras, `"{h}h {min}min"` para minutos);
 * no modo dias converte para dias (1 dia = `HORAS_POR_DIA` horas) em pt-BR.
 */
export function formatarTempoExibicao(
  valor: number,
  emDias: boolean,
  unidade: UnidadeTempoEntrada,
): string {
  const minutos = unidade === 'horas' ? valor * 60 : valor;

  if (emDias) return formatarEmDias(minutos);

  if (unidade === 'horas') return `${valor}h`;

  const horas = Math.floor(minutos / 60);
  const restanteMinutos = minutos % 60;
  return `${horas}h ${restanteMinutos}min`;
}

/** Converte minutos em dias e formata em pt-BR: vírgula, até 2 casas, singular só em "1 dia". */
function formatarEmDias(minutos: number): string {
  const dias = Math.round((minutos / (HORAS_POR_DIA * 60)) * 100) / 100;
  const texto = dias.toString().replace('.', ',');
  return `${texto} ${dias === 1 ? 'dia' : 'dias'}`;
}
