import { DemandaGrafoNoDto } from '@project20/shared';
import { PastaId } from './demanda-pasta.util';

/**
 * O foco do grafo (task 241): a pasta escolhida na Árvore e tudo que está dentro dela, em qualquer nível. O resto do grafo fica apagado. "Sem pasta"
 * (`null`) são as demandas da raiz que não são de estrutura, com o que estiver sob elas. A conta parte de **todas** as demandas do projeto: os
 * filtros da toolbar recortam depois do foco, e uma busca não pode esconder o pai de quem está dentro da pasta.
 */

function filhosPorPai(nos: readonly DemandaGrafoNoDto[]): Map<number, DemandaGrafoNoDto[]> {
  const ids = new Set(nos.map((no) => no.id));
  const mapa = new Map<number, DemandaGrafoNoDto[]>();
  for (const no of nos) {
    if (no.demandaPaiId !== null && no.demandaPaiId !== undefined && ids.has(no.demandaPaiId)) {
      mapa.set(no.demandaPaiId, [...(mapa.get(no.demandaPaiId) ?? []), no]);
    }
  }
  return mapa;
}

/** Os ids da pasta (ou das demandas soltas, em "Sem pasta") e de todos os descendentes. */
export function idsDoFoco(nos: readonly DemandaGrafoNoDto[], pastaId: PastaId): Set<number> {
  const filhos = filhosPorPai(nos);
  const ids = new Set(nos.map((no) => no.id));
  const iniciais: DemandaGrafoNoDto[] =
    pastaId === null
      ? nos.filter((no) => !no.isEstrutural && (no.demandaPaiId === null || no.demandaPaiId === undefined || !ids.has(no.demandaPaiId)))
      : nos.filter((no) => no.id === pastaId);

  const dentro = new Set<number>();
  const percorrer = (no: DemandaGrafoNoDto) => {
    if (dentro.has(no.id)) return;
    dentro.add(no.id);
    (filhos.get(no.id) ?? []).forEach(percorrer);
  };
  iniciais.forEach(percorrer);
  return dentro;
}

/** As pastas que estão direto na pasta do foco (ou na raiz, em "Sem pasta" não há: só demandas soltas). */
export function subpastasDoFoco(nos: readonly DemandaGrafoNoDto[], pastaId: PastaId): DemandaGrafoNoDto[] {
  if (pastaId === null) return [];
  return nos.filter((no) => no.isEstrutural && no.demandaPaiId === pastaId);
}

/** A pasta que contém a do foco; `undefined` quando o foco já está na raiz (ou em "Sem pasta"). */
export function pastaAcimaDoFoco(nos: readonly DemandaGrafoNoDto[], pastaId: PastaId): number | undefined {
  if (pastaId === null) return undefined;
  const atual = nos.find((no) => no.id === pastaId);
  const pai = atual?.demandaPaiId;
  return pai !== null && pai !== undefined && nos.some((no) => no.id === pai && no.isEstrutural) ? pai : undefined;
}
