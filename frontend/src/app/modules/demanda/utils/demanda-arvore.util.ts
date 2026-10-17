import { DemandaArvoreItemDto, DemandaGrafoNoDto } from '@project20/shared';

/** Monta a árvore de demandas (raízes com `filhos`) a partir dos nós planos do grafo do projeto. */
export function construirArvoreDemandas(nos: DemandaGrafoNoDto[]): DemandaArvoreItemDto[] {
  const mapa = new Map<number, DemandaArvoreItemDto>();

  for (const no of nos) {
    mapa.set(no.id, {
      id:                  no.id,
      nome:                no.nome,
      status:              no.status,
      isEstrutural:        no.isEstrutural,
      horasEstimadas:      no.horasEstimadas,
      minutosExecutados:   no.minutosExecutados,
      temDescricaoTecnica: no.temDescricaoTecnica,
      temDescricaoCliente: no.temDescricaoCliente,
      temDocumentacao:     no.temDocumentacao,
      tags:                no.tags ?? [],
      nivel:               0,
      filhos:              [],
    });
  }

  const raizes: DemandaArvoreItemDto[] = [];
  for (const no of nos) {
    const item = mapa.get(no.id)!;
    if (no.demandaPaiId && mapa.has(no.demandaPaiId)) {
      mapa.get(no.demandaPaiId)!.filhos.push(item);
    } else {
      raizes.push(item);
    }
  }
  return raizes;
}
