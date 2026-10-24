import type { ModelagemColunaDto, ModelagemDiagramaDto, ModelagemGrupoDto, ModelagemTabelaDto } from '@project20/shared';

/** Id do grupo que a tela cria sozinha para as tabelas sem grupo (`grupoId` nulo); os grupos do banco começam em 1. */
export const ID_SEM_GRUPO = 0;
/** Cor reservada ao "Sem grupo" (a paleta de grupos vai de 0 a 6). */
export const COR_SEM_GRUPO = 7;
export const GRUPO_SEM_GRUPO: ModelagemGrupoDto = { id: ID_SEM_GRUPO, titulo: 'Sem grupo', rotulo: 'Sem grupo', corIndice: COR_SEM_GRUPO };

export const ALTURA_CABECALHO_TABELA = 28;
export const ALTURA_LINHA_TABELA = 18;

export interface ModelagemAresta {
  origem: string;
  coluna: string;
  destino: string;
  /** Referência sem FK no banco (inferida pelo nome da coluna): desenhada tracejada. */
  logica: boolean;
}

export interface CaminhoAresta {
  caminho: string;
  origemX: number;
  origemY: number;
  /** Traço do lado "1" (a tabela referenciada); ausente na autorreferência. */
  destinoX: number | null;
  destinoY: number | null;
}

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Enquadramento {
  x: number;
  y: number;
  escala: number;
}

export function alturaDaTabela(tabela: Pick<ModelagemTabelaDto, 'colunas'>): number {
  return ALTURA_CABECALHO_TABELA + ALTURA_LINHA_TABELA * tabela.colunas.length + 6;
}

export function montarArestas(tabelas: readonly ModelagemTabelaDto[]): ModelagemAresta[] {
  const nomes = new Set(tabelas.map((tabela) => tabela.nome));
  return tabelas.flatMap((tabela) =>
    tabela.colunas
      .filter((coluna) => coluna.tabelaReferenciada && nomes.has(coluna.tabelaReferenciada))
      .map((coluna) => ({
        origem: tabela.nome,
        coluna: coluna.nome,
        destino: coluna.tabelaReferenciada as string,
        logica: coluna.marca === 'lg',
      })),
  );
}

/** A tabela e as que ela referencia ou que a referenciam: o que fica em destaque quando ela está em foco. */
export function vizinhasDe(nome: string, arestas: readonly ModelagemAresta[]): Set<string> {
  const vizinhas = new Set([nome]);
  for (const aresta of arestas) {
    if (aresta.origem === nome) vizinhas.add(aresta.destino);
    if (aresta.destino === nome) vizinhas.add(aresta.origem);
  }
  return vizinhas;
}

export function tabelaCasaBusca(tabela: ModelagemTabelaDto, termo: string): boolean {
  const busca = termo.trim().toLowerCase();
  if (!busca) return true;
  return tabela.nome.toLowerCase().includes(busca) || tabela.colunas.some((coluna) => coluna.nome.toLowerCase().includes(busca));
}

export function colunaCasaBusca(coluna: ModelagemColunaDto, termo: string): boolean {
  const busca = termo.trim().toLowerCase();
  return !!busca && coluna.nome.toLowerCase().includes(busca);
}

function yDaColuna(tabela: ModelagemTabelaDto, nomeColuna: string): number {
  const indice = Math.max(0, tabela.colunas.findIndex((coluna) => coluna.nome === nomeColuna));
  return tabela.y + ALTURA_CABECALHO_TABELA + ALTURA_LINHA_TABELA * indice + ALTURA_LINHA_TABELA / 2;
}

/** Curva da linha da FK, da linha da coluna de origem até a linha `id` da tabela referenciada. */
export function caminhoDaAresta(origem: ModelagemTabelaDto, coluna: string, destino: ModelagemTabelaDto): CaminhoAresta {
  const origemY = yDaColuna(origem, coluna);
  if (origem.nome === destino.nome) {
    const x = origem.x + origem.largura;
    const idY = yDaColuna(origem, 'id');
    return { caminho: `M${x},${origemY} C${x + 60},${origemY} ${x + 60},${idY - 50} ${x},${idY}`, origemX: x, origemY, destinoX: null, destinoY: null };
  }
  const destinoY = yDaColuna(destino, 'id');
  const origemDireita = origem.x + origem.largura;
  const destinoDireita = destino.x + destino.largura;
  let origemX: number;
  let destinoX: number;
  let sentidoOrigem: number;
  let sentidoDestino: number;
  if (origemDireita <= destino.x - 10) {
    [origemX, destinoX, sentidoOrigem, sentidoDestino] = [origemDireita, destino.x, 1, -1];
  } else if (destinoDireita <= origem.x - 10) {
    [origemX, destinoX, sentidoOrigem, sentidoDestino] = [origem.x, destinoDireita, -1, 1];
  } else {
    [origemX, destinoX, sentidoOrigem, sentidoDestino] = [origem.x, destino.x, -1, -1];
  }
  const folga = sentidoOrigem !== sentidoDestino ? Math.max(50, Math.abs(destinoX - origemX) * 0.45) : 70;
  const caminho = `M${origemX},${origemY} C${origemX + sentidoOrigem * folga},${origemY} ${destinoX + sentidoDestino * folga},${destinoY} ${destinoX},${destinoY}`;
  return { caminho, origemX, origemY, destinoX, destinoY };
}

/** Retângulo que envolve as tabelas, com a folga pedida (a caixa do grupo usa mais folga em cima, para o título). */
export function retanguloDasTabelas(tabelas: readonly ModelagemTabelaDto[], folga: { lados: number; topo: number; base: number }): Retangulo | null {
  if (!tabelas.length) return null;
  const esquerda = Math.min(...tabelas.map((tabela) => tabela.x)) - folga.lados;
  const topo = Math.min(...tabelas.map((tabela) => tabela.y)) - folga.topo;
  const direita = Math.max(...tabelas.map((tabela) => tabela.x + tabela.largura)) + folga.lados;
  const base = Math.max(...tabelas.map((tabela) => tabela.y + alturaDaTabela(tabela))) + folga.base;
  return { x: esquerda, y: topo, largura: direita - esquerda, altura: base - topo };
}

/** Escala e deslocamento que deixam o retângulo inteiro e centralizado na área visível. */
export function enquadrar(retangulo: Retangulo, larguraVisivel: number, alturaVisivel: number): Enquadramento {
  const escala = Math.min(larguraVisivel / retangulo.largura, alturaVisivel / retangulo.altura);
  return {
    escala,
    x: (larguraVisivel - retangulo.largura * escala) / 2 - retangulo.x * escala,
    y: (alturaVisivel - retangulo.altura * escala) / 2 - retangulo.y * escala,
  };
}

/** Id do grupo na tela: o `grupoId` da tabela, ou o do "Sem grupo" quando ela não tem grupo. */
export function grupoDaTabela(tabela: Pick<ModelagemTabelaDto, 'grupoId'>): number {
  return tabela.grupoId ?? ID_SEM_GRUPO;
}

/** Os grupos do diagrama na ordem do banco, mais o "Sem grupo" no fim quando alguma tabela está sem grupo. */
export function gruposDoDiagrama(diagrama: Pick<ModelagemDiagramaDto, 'grupos' | 'tabelas'>): ModelagemGrupoDto[] {
  const haSemGrupo = diagrama.tabelas.some((tabela) => tabela.grupoId === null);
  return haSemGrupo ? [...diagrama.grupos, GRUPO_SEM_GRUPO] : diagrama.grupos;
}

/** Quantas tabelas há em cada grupo (as sem grupo contam no `ID_SEM_GRUPO`). */
export function contarTabelasPorGrupo(tabelas: readonly Pick<ModelagemTabelaDto, 'grupoId'>[]): Map<number, number> {
  const contagem = new Map<number, number>();
  for (const tabela of tabelas) contagem.set(grupoDaTabela(tabela), (contagem.get(grupoDaTabela(tabela)) ?? 0) + 1);
  return contagem;
}
