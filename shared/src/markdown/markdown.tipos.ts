/**
 * Árvore produzida por `interpretarMarkdown`. O texto vira estes nós e nunca HTML: quem exibe monta
 * elementos a partir dos nós, então nada do texto do usuário chega à página como marcação.
 */

/** Trechos dentro de uma linha: texto, ênfase, código e link. */
export type MarkdownInlineNo =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'quebra' }
  | { tipo: 'negrito'; filhos: MarkdownInlineNo[] }
  | { tipo: 'italico'; filhos: MarkdownInlineNo[] }
  | { tipo: 'tachado'; filhos: MarkdownInlineNo[] }
  | { tipo: 'codigo'; valor: string }
  | { tipo: 'link'; url: string; filhos: MarkdownInlineNo[] };

export interface MarkdownItemLista {
  /** `null` quando o item não é de tarefa (`- [ ]` / `- [x]`). */
  tarefa: 'marcada' | 'desmarcada' | null;
  filhos: MarkdownInlineNo[];
  sublistas: MarkdownListaNo[];
}

export interface MarkdownListaNo {
  tipo: 'lista';
  ordenada: boolean;
  /** Número do primeiro item (só importa em lista ordenada). */
  inicio: number;
  itens: MarkdownItemLista[];
}

export type MarkdownAlinhamento = 'esquerda' | 'centro' | 'direita' | null;

/** Tabela (só com `opcoes.tabelas`, P-039): `alinhamentos` e cada linha têm uma entrada por coluna do cabeçalho. */
export interface MarkdownTabelaNo {
  tipo: 'tabela';
  alinhamentos: MarkdownAlinhamento[];
  cabecalho: MarkdownInlineNo[][];
  linhas: MarkdownInlineNo[][][];
}

/** Blocos de nível superior: títulos, parágrafos, listas, citações, código, régua e (opcional) tabela. */
export type MarkdownBlocoNo =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3 | 4; filhos: MarkdownInlineNo[] }
  | { tipo: 'paragrafo'; filhos: MarkdownInlineNo[] }
  | MarkdownListaNo
  | { tipo: 'citacao'; filhos: MarkdownBlocoNo[] }
  | { tipo: 'bloco-codigo'; linguagem: string | null; valor: string }
  | { tipo: 'regua' }
  | MarkdownTabelaNo;

export type MarkdownNo = MarkdownBlocoNo | MarkdownInlineNo;
