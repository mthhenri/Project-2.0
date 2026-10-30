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

/** Divisão da tela do relatório (task 272): a tabela ocupa `divisao`% da largura e o painel da revisão por IA, o resto. */
export const DIVISAO_DO_RELATORIO = { minima: 35, maxima: 80, padrao: 62, passoDoTeclado: 3 } as const;

export function limitarDivisao(divisao: number): number {
  return Math.min(DIVISAO_DO_RELATORIO.maxima, Math.max(DIVISAO_DO_RELATORIO.minima, Math.round(divisao)));
}

/** A divisão (em %) que o ponteiro em `clientX` pede, numa área que começa em `esquerda` e tem `largura` px. */
export function divisaoPeloPonteiro(clientX: number, esquerda: number, largura: number): number {
  if (largura <= 0) return DIVISAO_DO_RELATORIO.padrao;
  return limitarDivisao(((clientX - esquerda) / largura) * 100);
}
