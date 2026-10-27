import { DemandaDocumentacaoResumoDto } from '@project20/shared';
import { normalizarTexto } from '../../demanda/utils/demanda-filtro.util';

/** Um nó da árvore do seletor: um projeto (com as demandas raiz dele) ou uma demanda (com as filhas). */
export interface NoDocumentacao {
  chave: string;
  tipo: 'projeto' | 'demanda';
  nome: string;
  /** A demanda, quando o nó é uma demanda. */
  demanda: DemandaDocumentacaoResumoDto | null;
  filhos: NoDocumentacao[];
}

/**
 * Monta a árvore projeto → demandas aninhadas a partir da lista plana. A demanda cuja mãe não veio na lista vira raiz do projeto. A ordem dos
 * projetos e das demandas é a da lista (a API já ordena por projeto e nome).
 */
export function montarArvoreDocumentacao(itens: readonly DemandaDocumentacaoResumoDto[]): NoDocumentacao[] {
  const nosDemanda = new Map<number, NoDocumentacao>(
    itens.map((demanda) => [demanda.id, { chave: `demanda-${demanda.id}`, tipo: 'demanda', nome: demanda.nome, demanda, filhos: [] }]),
  );
  const projetos = new Map<number, NoDocumentacao>();
  for (const demanda of itens) {
    const no = nosDemanda.get(demanda.id)!;
    const mae = demanda.demandaPaiId === null ? undefined : nosDemanda.get(demanda.demandaPaiId);
    if (mae) {
      mae.filhos.push(no);
      continue;
    }
    let projeto = projetos.get(demanda.projetoId);
    if (!projeto) {
      projeto = { chave: `projeto-${demanda.projetoId}`, tipo: 'projeto', nome: demanda.projetoNome, demanda: null, filhos: [] };
      projetos.set(demanda.projetoId, projeto);
    }
    projeto.filhos.push(no);
  }
  return [...projetos.values()];
}

/** O resultado de uma busca: os ids das demandas que aparecem (as que batem e todos os ancestrais) e os nós que a árvore abre sozinha. */
export interface RecorteDaBusca {
  visiveis: Set<number>;
  projetosVisiveis: Set<number>;
  expandir: Set<string>;
  correspondentes: number;
}

/**
 * Filtra a lista pela busca, sem acento e sem diferenciar caixa: aparecem as demandas cujo nome tem o termo (ou cujo projeto tem) mais os
 * ancestrais delas, para a hierarquia continuar legível. Termo vazio mostra tudo.
 */
export function recortarPelaBusca(itens: readonly DemandaDocumentacaoResumoDto[], termo: string): RecorteDaBusca {
  const alvo = normalizarTexto(termo.trim());
  const visiveis = new Set<number>();
  const projetosVisiveis = new Set<number>();
  const expandir = new Set<string>();
  if (!alvo) {
    for (const demanda of itens) {
      visiveis.add(demanda.id);
      projetosVisiveis.add(demanda.projetoId);
    }
    return { visiveis, projetosVisiveis, expandir, correspondentes: itens.length };
  }

  const porId = new Map(itens.map((demanda) => [demanda.id, demanda]));
  let correspondentes = 0;
  for (const demanda of itens) {
    const bate = normalizarTexto(demanda.nome).includes(alvo) || normalizarTexto(demanda.projetoNome).includes(alvo);
    if (!bate) continue;
    correspondentes++;
    visiveis.add(demanda.id);
    projetosVisiveis.add(demanda.projetoId);
    expandir.add(`projeto-${demanda.projetoId}`);
    let maeId = demanda.demandaPaiId;
    while (maeId !== null && porId.has(maeId)) {
      visiveis.add(maeId);
      expandir.add(`demanda-${maeId}`);
      maeId = porId.get(maeId)!.demandaPaiId;
    }
  }
  return { visiveis, projetosVisiveis, expandir, correspondentes };
}

/** "Projeto › Mãe › Avó": onde a demanda mora, sem o nome dela (o botão do seletor mostra o nome à parte). */
export function caminhoDaDemanda(demanda: DemandaDocumentacaoResumoDto): string {
  const nomes = demanda.caminho.split(' › ');
  const ancestrais = nomes.slice(0, -1);
  return [demanda.projetoNome, ...ancestrais].join(' › ');
}

/** O código da execução que a primeira visita abre: a demanda com execução rodando (a primeira, se houver várias). */
export function demandaEmExecucao(itens: readonly DemandaDocumentacaoResumoDto[]): DemandaDocumentacaoResumoDto | null {
  return itens.find((demanda) => demanda.emExecucao) ?? null;
}

/** Quantos textos da demanda estão preenchidos (para o "3/3" do seletor, se preciso). */
export function textosPreenchidos(demanda: Pick<DemandaDocumentacaoResumoDto, 'temDescricaoTecnica' | 'temDescricaoCliente' | 'temDocumentacao'>): number {
  return [demanda.temDescricaoTecnica, demanda.temDescricaoCliente, demanda.temDocumentacao].filter(Boolean).length;
}

/** Os limites e o padrão da divisão entre a demanda e o pad (a demanda ocupa essa parte da largura), em %. */
export const DIVISAO_DA_TELA = { padrao: 56, minima: 34, maxima: 72, passoDoTeclado: 2 } as const;

/** Mantém a parte da demanda entre 34% e 72%; valor ilegível volta ao padrão. */
export function limitarDivisao(percentual: number): number {
  if (!Number.isFinite(percentual)) return DIVISAO_DA_TELA.padrao;
  return Math.min(DIVISAO_DA_TELA.maxima, Math.max(DIVISAO_DA_TELA.minima, Math.round(percentual * 10) / 10));
}

/** A parte da demanda para a posição do ponteiro: a demanda fica à esquerda, então é o que está antes do ponteiro. */
export function divisaoPeloPonteiro(ponteiroX: number, areaEsquerda: number, areaLargura: number): number {
  if (areaLargura <= 0) return DIVISAO_DA_TELA.padrao;
  return limitarDivisao(((ponteiroX - areaEsquerda) / areaLargura) * 100);
}
