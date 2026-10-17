import { RelatorioPeriodoTipoEnum } from '@project20/shared';

/** Atalhos de período do dialog de relatório (task 111). */
export type RelatorioPeriodoAtalho = 'MES' | 'PASSADO' | 'ANO' | 'CUSTOM';

export interface RelatorioPeriodoSelecao {
  periodoTipo: RelatorioPeriodoTipoEnum;
  ano: number;
  mes: number;
}

/** Período (tipo/ano/mês) que cada atalho representa em `hoje`; `CUSTOM` mantém ano/mês correntes. */
export function periodoDoAtalho(atalho: RelatorioPeriodoAtalho, hoje: Date = new Date()): RelatorioPeriodoSelecao {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  switch (atalho) {
    case 'MES':
      return { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano, mes };
    case 'PASSADO':
      return {
        periodoTipo: RelatorioPeriodoTipoEnum.MENSAL,
        ano: mes === 1 ? ano - 1 : ano,
        mes: mes === 1 ? 12 : mes - 1,
      };
    case 'ANO':
      return { periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano, mes };
    case 'CUSTOM':
      return { periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, ano, mes };
  }
}

/** Atalho que corresponde à seleção atual, ou `null` quando é um ajuste fino (ex.: março de 2024). */
export function atalhoDoPeriodo(selecao: RelatorioPeriodoSelecao, hoje: Date = new Date()): RelatorioPeriodoAtalho | null {
  if (selecao.periodoTipo === RelatorioPeriodoTipoEnum.CUSTOM) return 'CUSTOM';
  for (const atalho of ['MES', 'PASSADO', 'ANO'] as const) {
    const alvo = periodoDoAtalho(atalho, hoje);
    if (alvo.periodoTipo !== selecao.periodoTipo || alvo.ano !== selecao.ano) continue;
    if (selecao.periodoTipo === RelatorioPeriodoTipoEnum.ANUAL || alvo.mes === selecao.mes) return atalho;
  }
  return null;
}

const ORDEM_SEVERIDADE = ['ALTA', 'MEDIA', 'BAIXA'];

/** "Média"/"MÉDIA"/"media" → "MEDIA". */
export function normalizarSeveridade(severidade: string | null | undefined): string {
  return (severidade ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

/** Posição na ordem ALTA → MÉDIA → BAIXA; severidade desconhecida vai para o fim. */
export function ordemSeveridade(severidade: string | null | undefined): number {
  const indice = ORDEM_SEVERIDADE.indexOf(normalizarSeveridade(severidade));
  return indice === -1 ? ORDEM_SEVERIDADE.length : indice;
}
