import { TagResumoDto } from '@project20/shared';

/** A listagem do servidor vem ordenada por nome; as inserções locais usam a mesma comparação. */
export function compararTagsPorNome(tagA: Pick<TagResumoDto, 'nome'>, tagB: Pick<TagResumoDto, 'nome'>): number {
  return tagA.nome.localeCompare(tagB.nome, 'pt-BR');
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function nomeDeTagIgual(nomeA: string, nomeB: string): boolean {
  return normalizar(nomeA) === normalizar(nomeB);
}

export function nomeDeTagContem(nome: string, termo: string): boolean {
  return normalizar(nome).includes(normalizar(termo));
}

/** Estilo do pill: fundo, texto e borda derivados da cor da tag. */
export function estiloPillTag(cor: string): Record<string, string> {
  return { 'background-color': cor + '22', color: cor, 'border-color': cor + '55' };
}
