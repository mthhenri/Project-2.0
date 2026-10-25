import { DemandaGrafoNoDto } from '@project20/shared';

/**
 * A Árvore de demandas (task 239): as **pastas** são as demandas de estrutura; cada pasta mostra só as demandas que estão **direto** nela.
 * "Sem pasta" reúne as demandas da raiz que não são de estrutura. A pasta escolhida é um id, ou `null` para "Sem pasta".
 */
export type PastaId = number | null;

/** Valor de `?pasta=` para "Sem pasta". */
export const PASTA_SEM_PASTA_NA_URL = 'sem-pasta';

export interface PastaNo {
  id: number;
  nome: string;
  nivel: number;
  /** Quantas demandas (não de estrutura) estão direto nela. */
  quantidade: number;
  filhas: PastaNo[];
}

const ehPasta = (no: DemandaGrafoNoDto): boolean => no.isEstrutural;

/** Os nós que são raiz do projeto: sem pai, ou com o pai fora da lista. */
function ehRaiz(no: DemandaGrafoNoDto, ids: ReadonlySet<number>): boolean {
  return no.demandaPaiId === null || no.demandaPaiId === undefined || !ids.has(no.demandaPaiId);
}

/** Lê o `?pasta=`: `sem-pasta` vira `null`; um id vira número; ausente ou inválido volta `undefined` (quem lê escolhe a pasta de partida). */
export function lerPastaDaUrl(valor: string | null): PastaId | undefined {
  if (valor === null || valor.trim() === '') return undefined;
  if (valor === PASTA_SEM_PASTA_NA_URL) return null;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** O valor de `?pasta=` para a pasta escolhida. */
export function pastaParaUrl(pastaId: PastaId): string {
  return pastaId === null ? PASTA_SEM_PASTA_NA_URL : String(pastaId);
}

/** A árvore de pastas (só as demandas de estrutura), com a contagem das demandas diretas de cada uma. */
export function construirPastas(nos: readonly DemandaGrafoNoDto[]): PastaNo[] {
  const ids = new Set(nos.map((no) => no.id));
  const filhasPorPai = new Map<number, DemandaGrafoNoDto[]>();
  for (const no of nos) {
    if (no.demandaPaiId !== null && no.demandaPaiId !== undefined && ids.has(no.demandaPaiId)) {
      filhasPorPai.set(no.demandaPaiId, [...(filhasPorPai.get(no.demandaPaiId) ?? []), no]);
    }
  }
  const montar = (no: DemandaGrafoNoDto, nivel: number): PastaNo => {
    const filhos = filhasPorPai.get(no.id) ?? [];
    return {
      id: no.id,
      nome: no.nome,
      nivel,
      quantidade: filhos.filter((filho) => !ehPasta(filho)).length,
      filhas: filhos.filter(ehPasta).map((filha) => montar(filha, nivel + 1)),
    };
  };
  return nos.filter((no) => ehPasta(no) && ehRaiz(no, ids)).map((no) => montar(no, 0));
}

/** As demandas (que não são de estrutura) que estão direto na pasta; `null` é "Sem pasta". */
export function demandasDaPasta(nos: readonly DemandaGrafoNoDto[], pastaId: PastaId): DemandaGrafoNoDto[] {
  const ids = new Set(nos.map((no) => no.id));
  return nos.filter((no) => !ehPasta(no) && (pastaId === null ? ehRaiz(no, ids) : no.demandaPaiId === pastaId));
}

/** Quantas demandas há em "Sem pasta". */
export function contarSemPasta(nos: readonly DemandaGrafoNoDto[]): number {
  return demandasDaPasta(nos, null).length;
}

/** Todas as pastas em ordem de tela (cada uma seguida das filhas), úteis para achar a primeira e para a navegação por teclado. */
export function listarPastasEmOrdem(pastas: readonly PastaNo[]): PastaNo[] {
  return pastas.flatMap((pasta) => [pasta, ...listarPastasEmOrdem(pasta.filhas)]);
}

/** A pasta em que a demanda mora: a do pai; uma demanda de estrutura é a própria pasta; sem pai, "Sem pasta" (`null`). */
export function pastaDaDemanda(nos: readonly DemandaGrafoNoDto[], demandaId: number): PastaId | undefined {
  const no = nos.find((item) => item.id === demandaId);
  if (!no) return undefined;
  if (ehPasta(no)) return no.id;
  const ids = new Set(nos.map((item) => item.id));
  return ehRaiz(no, ids) ? null : no.demandaPaiId;
}

/** Os ancestrais da pasta (do topo até o pai direto), para abrir os ramos até ela. */
export function ancestraisDaPasta(nos: readonly DemandaGrafoNoDto[], pastaId: number): number[] {
  const porId = new Map(nos.map((no) => [no.id, no]));
  const ancestrais: number[] = [];
  let atual = porId.get(pastaId)?.demandaPaiId ?? null;
  while (atual !== null && porId.has(atual) && !ancestrais.includes(atual)) {
    ancestrais.unshift(atual);
    atual = porId.get(atual)!.demandaPaiId ?? null;
  }
  return ancestrais;
}

/** O caminho em nomes até a pasta, com o nome dela no fim ("Sem pasta" quando `null`). */
export function caminhoDaPasta(nos: readonly DemandaGrafoNoDto[], pastaId: PastaId): string[] {
  if (pastaId === null) return ['Sem pasta'];
  const porId = new Map(nos.map((no) => [no.id, no]));
  return [...ancestraisDaPasta(nos, pastaId), pastaId].map((id) => porId.get(id)?.nome ?? '');
}

/** A pasta de partida: a da URL se existe neste projeto; senão "Sem pasta" quando tem demandas; senão a primeira pasta; senão `null`. */
export function pastaInicial(nos: readonly DemandaGrafoNoDto[], daUrl: PastaId | undefined): PastaId {
  if (daUrl === null) return null;
  if (daUrl !== undefined && nos.some((no) => no.id === daUrl && ehPasta(no))) return daUrl;
  if (contarSemPasta(nos) > 0) return null;
  return listarPastasEmOrdem(construirPastas(nos))[0]?.id ?? null;
}
