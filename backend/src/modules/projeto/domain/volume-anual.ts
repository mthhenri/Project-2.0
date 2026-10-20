import { ProjetoVolumeAnualResumoDto, ProjetoVolumeMesDto } from '@project20/shared';

/** Primeiro e último dia (YYYY-MM-DD) de um ano civil: o intervalo da visão anual do volume (task 199). */
export function limitesDoAno(ano: number): { dataInicio: string; dataFim: string } {
  return { dataInicio: `${ano}-01-01`, dataFim: `${ano}-12-31` };
}

/**
 * Agrupa as linhas (projeto × mês) do repository em um item por projeto, com os doze meses em ordem (índice 0 = janeiro).
 * A ordem dos projetos é a das linhas; mês que faltar na linha vale 0.
 */
export function agruparVolumePorProjeto(linhas: readonly ProjetoVolumeMesDto[]): ProjetoVolumeAnualResumoDto[] {
  const porProjeto = new Map<number, ProjetoVolumeAnualResumoDto>();
  for (const linha of linhas) {
    let projeto = porProjeto.get(linha.projetoId);
    if (!projeto) {
      projeto = {
        projetoId: linha.projetoId,
        nome: linha.nome,
        codigo: linha.codigo,
        cor: linha.cor,
        volumeEsperadoHorasMes: linha.volumeEsperadoHorasMes,
        minutosGastosPorMes: new Array<number>(12).fill(0),
      };
      porProjeto.set(linha.projetoId, projeto);
    }
    projeto.minutosGastosPorMes[linha.mes - 1] = linha.minutosGastos;
  }
  return [...porProjeto.values()];
}
