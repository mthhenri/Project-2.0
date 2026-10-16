import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';

/** Critérios da toolbar de Demandas; valem para a Lista e para o Grafo (task 106). */
export interface DemandaFiltro {
  termo: string;
  status: TipoDemandaStatusEnum[];
  tagIds: number[];
}

export const FILTRO_VAZIO: DemandaFiltro = { termo: '', status: [], tagIds: [] };

export function filtroAtivo(filtro: DemandaFiltro): boolean {
  return filtro.termo.trim() !== '' || filtro.status.length > 0 || filtro.tagIds.length > 0;
}

/** Minúsculas e sem acentos: "Integração" encontra "integracao". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function corresponde(no: DemandaGrafoNoDto, filtro: DemandaFiltro, ignorarStatus: boolean): boolean {
  const termo = normalizarTexto(filtro.termo.trim());
  if (termo && !normalizarTexto(no.nome).includes(termo)) return false;
  if (!ignorarStatus && filtro.status.length && !filtro.status.includes(no.status)) return false;
  if (filtro.tagIds.length && !(no.tags ?? []).some((tag) => filtro.tagIds.includes(tag.id))) return false;
  return true;
}

/** Nós que atendem a todos os critérios (sem os ancestrais): é o que o Grafo exibe. */
export function nosCorrespondentes(nos: DemandaGrafoNoDto[], filtro: DemandaFiltro): DemandaGrafoNoDto[] {
  return filtroAtivo(filtro) ? nos.filter((no) => corresponde(no, filtro, false)) : nos;
}

/**
 * Árvore filtrada: os nós que atendem ao filtro mais todos os seus ancestrais (para a hierarquia
 * continuar legível). `expandir` traz os ancestrais dos correspondentes, que a Lista abre sozinha.
 */
export function recortarArvore(
  nos: DemandaGrafoNoDto[],
  filtro: DemandaFiltro,
): { nos: DemandaGrafoNoDto[]; expandir: Set<number> } {
  if (!filtroAtivo(filtro)) return { nos, expandir: new Set() };

  const porId = new Map(nos.map((no) => [no.id, no]));
  const visiveis = new Set<number>();
  const expandir = new Set<number>();

  for (const no of nos) {
    if (!corresponde(no, filtro, false)) continue;
    visiveis.add(no.id);
    let paiId = no.demandaPaiId;
    while (paiId && porId.has(paiId)) {
      visiveis.add(paiId);
      expandir.add(paiId);
      paiId = porId.get(paiId)!.demandaPaiId;
    }
  }
  return { nos: nos.filter((no) => visiveis.has(no.id)), expandir };
}

/** Contador de cada status aplicando busca e tags, mas não o próprio filtro de status. */
export function contarPorStatus(nos: DemandaGrafoNoDto[], filtro: DemandaFiltro): Record<TipoDemandaStatusEnum, number> {
  const contagem = Object.fromEntries(Object.values(TipoDemandaStatusEnum).map((status) => [status, 0])) as Record<
    TipoDemandaStatusEnum,
    number
  >;
  for (const no of nos) {
    if (corresponde(no, filtro, true)) contagem[no.status]++;
  }
  return contagem;
}

/** Quebra o nome em trechos para destacar o termo (sem acento/maiúscula, preservando o texto original). */
export function dividirDestaque(nome: string, termo: string): { texto: string; destaque: boolean }[] {
  const alvo = normalizarTexto(termo.trim());
  if (!alvo) return [{ texto: nome, destaque: false }];

  // NFD pode alongar o texto; mapeamos cada caractere original ao seu equivalente normalizado.
  const normalizados = [...nome].map((caractere) => normalizarTexto(caractere));
  const trechos: { texto: string; destaque: boolean }[] = [];
  const caracteres = [...nome];
  let cursor = 0;
  let pendente = '';

  while (cursor < caracteres.length) {
    let acumulado = '';
    let fim = cursor;
    while (fim < caracteres.length && acumulado.length < alvo.length) acumulado += normalizados[fim++];
    if (acumulado === alvo) {
      if (pendente) trechos.push({ texto: pendente, destaque: false });
      pendente = '';
      trechos.push({ texto: caracteres.slice(cursor, fim).join(''), destaque: true });
      cursor = fim;
    } else {
      pendente += caracteres[cursor++];
    }
  }
  if (pendente) trechos.push({ texto: pendente, destaque: false });
  return trechos;
}
