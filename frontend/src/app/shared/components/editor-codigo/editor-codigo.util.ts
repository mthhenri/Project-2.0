/**
 * Regras puras do editor de código (task 216): o que Tab, Shift+Tab e Enter fazem no texto. Nada aqui conhece o DOM; o componente lê a
 * seleção do `<textarea>`, chama a regra e aplica o resultado.
 */

/** O texto depois da edição e a seleção que ele deve ter (`inicio === fim` é só o cursor). */
export interface EdicaoDoEditor {
  texto: string;
  inicio: number;
  fim: number;
}

/** Um nível de recuo. */
export const RECUO = '  ';

/** O que, no fim da linha antes do cursor, pede um nível a mais na linha de baixo. */
const ABRE_NIVEL = /[{([:]$/;
const FECHA_PAR: Record<string, string> = { '{': '}', '(': ')', '[': ']' };

/** O início da linha que contém a posição. */
function inicioDaLinha(texto: string, posicao: number): number {
  return texto.lastIndexOf('\n', posicao - 1) + 1;
}

/** O recuo (espaços e tabs) com que a linha começa. */
function recuoDaLinha(texto: string, inicioDaLinhaAtual: number): string {
  return /^[ \t]*/.exec(texto.slice(inicioDaLinhaAtual))![0];
}

/**
 * As linhas tocadas pela seleção: do começo da primeira ao fim da última. Uma seleção que termina no começo de uma linha (depois de um
 * `\n`) não toca essa última linha, como nos editores de código.
 */
function linhasTocadas(texto: string, inicio: number, fim: number): { de: number; ate: number } {
  const de = inicioDaLinha(texto, inicio);
  const fimEfetivo = fim > inicio && texto[fim - 1] === '\n' ? fim - 1 : fim;
  const proximaQuebra = texto.indexOf('\n', fimEfetivo);
  return { de, ate: proximaQuebra === -1 ? texto.length : proximaQuebra };
}

/**
 * Tab. Sem seleção, insere um nível de recuo no cursor; com seleção, recua todas as linhas que ela toca (a seleção continua cobrindo o mesmo
 * conteúdo).
 */
export function indentar(texto: string, inicio: number, fim: number): EdicaoDoEditor {
  if (inicio === fim) {
    return { texto: texto.slice(0, inicio) + RECUO + texto.slice(fim), inicio: inicio + RECUO.length, fim: inicio + RECUO.length };
  }
  const { de, ate } = linhasTocadas(texto, inicio, fim);
  const linhas = texto.slice(de, ate).split('\n');
  const novoTrecho = linhas.map((linha) => (linha === '' ? linha : RECUO + linha)).join('\n');
  const primeiraRecuada = linhas[0] === '' ? 0 : RECUO.length;
  const acrescimoTotal = novoTrecho.length - (ate - de);
  return {
    texto: texto.slice(0, de) + novoTrecho + texto.slice(ate),
    inicio: inicio + primeiraRecuada,
    fim: fim + acrescimoTotal,
  };
}

/** Quantos caracteres de recuo a linha perde no Shift+Tab: um nível de espaços (até 2) ou um tab. */
function recuoARemover(linha: string): number {
  if (linha.startsWith('\t')) return 1;
  const espacos = /^ */.exec(linha)![0].length;
  return Math.min(espacos, RECUO.length);
}

/** Shift+Tab: tira um nível de recuo de cada linha que a seleção (ou o cursor) toca. */
export function desindentar(texto: string, inicio: number, fim: number): EdicaoDoEditor {
  const { de, ate } = linhasTocadas(texto, inicio, fim);
  const linhas = texto.slice(de, ate).split('\n');
  const removidos = linhas.map(recuoARemover);
  const novoTrecho = linhas.map((linha, indice) => linha.slice(removidos[indice])).join('\n');
  const totalRemovido = removidos.reduce((soma, quantidade) => soma + quantidade, 0);
  return {
    texto: texto.slice(0, de) + novoTrecho + texto.slice(ate),
    // O começo da seleção nunca recua para antes do começo da própria linha.
    inicio: Math.max(de, inicio - removidos[0]),
    fim: Math.max(de, fim - totalRemovido),
  };
}

/**
 * Enter. Quebra a linha mantendo o recuo da linha atual e abre um nível a mais depois de `{`, `(`, `[` ou `:`. Entre um par recém-aberto
 * (`{|}`), o fechamento desce para a linha de baixo e o cursor fica na linha do meio, já recuada. A seleção, se houver, é substituída.
 */
export function quebrarLinha(texto: string, inicio: number, fim: number): EdicaoDoEditor {
  const antes = texto.slice(0, inicio);
  const depois = texto.slice(fim);
  const recuo = recuoDaLinha(texto, inicioDaLinha(texto, inicio));
  const ultimoCaractere = antes.trimEnd().slice(-1);
  const abreNivel = ABRE_NIVEL.test(antes.trimEnd()) && antes.trimEnd().length === antes.length;
  const recuoDaNova = abreNivel ? recuo + RECUO : recuo;

  const fechamentoEsperado = abreNivel ? FECHA_PAR[ultimoCaractere] : undefined;
  if (fechamentoEsperado && depois.startsWith(fechamentoEsperado)) {
    const meio = `\n${recuoDaNova}`;
    const cursor = antes.length + meio.length;
    return { texto: `${antes}${meio}\n${recuo}${depois}`, inicio: cursor, fim: cursor };
  }
  const quebra = `\n${recuoDaNova}`;
  const cursor = antes.length + quebra.length;
  return { texto: antes + quebra + depois, inicio: cursor, fim: cursor };
}

/** O trecho que mudou entre dois textos: o que sai (`inicio` a `fimAntigo` do texto antigo) e o que entra no lugar. */
export interface DiferencaDeTexto {
  inicio: number;
  fimAntigo: number;
  inserido: string;
}

/**
 * Menor troca que leva `antigo` a `novo` (prefixo e sufixo em comum ficam de fora). O editor aplica só esse trecho com o comando nativo de
 * inserção, para o Ctrl+Z do navegador desfazer a edição e a rolagem não pular.
 */
export function diferencaDeTexto(antigo: string, novo: string): DiferencaDeTexto {
  let inicio = 0;
  const limite = Math.min(antigo.length, novo.length);
  while (inicio < limite && antigo[inicio] === novo[inicio]) inicio++;
  let sobraAntigo = antigo.length;
  let sobraNovo = novo.length;
  while (sobraAntigo > inicio && sobraNovo > inicio && antigo[sobraAntigo - 1] === novo[sobraNovo - 1]) {
    sobraAntigo--;
    sobraNovo--;
  }
  return { inicio, fimAntigo: sobraAntigo, inserido: novo.slice(inicio, sobraNovo) };
}
