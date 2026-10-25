import { TrechoDiffTipoEnum } from '../enums/trecho-diff-tipo.enum';

/** Um trecho contíguo do diff: o texto exato, com os espaços e as quebras de linha que ele tinha. */
export interface TrechoDiff {
  tipo: TrechoDiffTipoEnum;
  texto: string;
}

/**
 * Acima deste produto (palavras antes × palavras depois, já sem o começo e o fim iguais) o diff não calcula o alinhamento: troca o
 * miolo inteiro, para texto grande nunca travar a tela. 4 milhões de células cabem folgadamente em memória e em tempo.
 */
export const LIMITE_DE_CELULAS_DO_DIFF_POR_PALAVRA = 4_000_000;

/** Quebra o texto em palavras e em blocos de espaço, nesta ordem, de modo que juntar tudo devolve o texto original. */
function separarEmPalavras(texto: string): string[] {
  return texto.match(/\s+|\S+/g) ?? [];
}

function juntarTrechos(trechos: TrechoDiff[]): TrechoDiff[] {
  const juntados: TrechoDiff[] = [];
  for (const trecho of trechos) {
    if (trecho.texto === '') continue;
    const ultimo = juntados[juntados.length - 1];
    if (ultimo && ultimo.tipo === trecho.tipo) ultimo.texto += trecho.texto;
    else juntados.push({ ...trecho });
  }
  return juntados;
}

/** Alinha o miolo pela maior subsequência comum de palavras; o que sobra de cada lado é removido ou adicionado. */
function alinharMiolo(antes: string[], depois: string[]): TrechoDiff[] {
  if (antes.length === 0) return [{ tipo: TrechoDiffTipoEnum.ADICIONADO, texto: depois.join('') }];
  if (depois.length === 0) return [{ tipo: TrechoDiffTipoEnum.REMOVIDO, texto: antes.join('') }];
  if (antes.length * depois.length > LIMITE_DE_CELULAS_DO_DIFF_POR_PALAVRA) {
    return [
      { tipo: TrechoDiffTipoEnum.REMOVIDO, texto: antes.join('') },
      { tipo: TrechoDiffTipoEnum.ADICIONADO, texto: depois.join('') },
    ];
  }

  const colunas = depois.length + 1;
  // comprimento[i * colunas + j] = tamanho da maior subsequência comum de antes[i..] com depois[j..].
  const comprimento = new Uint32Array((antes.length + 1) * colunas);
  for (let i = antes.length - 1; i >= 0; i--) {
    for (let j = depois.length - 1; j >= 0; j--) {
      comprimento[i * colunas + j] =
        antes[i] === depois[j]
          ? comprimento[(i + 1) * colunas + j + 1] + 1
          : Math.max(comprimento[(i + 1) * colunas + j], comprimento[i * colunas + j + 1]);
    }
  }

  const trechos: TrechoDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < antes.length && j < depois.length) {
    if (antes[i] === depois[j]) {
      trechos.push({ tipo: TrechoDiffTipoEnum.IGUAL, texto: antes[i] });
      i++;
      j++;
    } else if (comprimento[(i + 1) * colunas + j] >= comprimento[i * colunas + j + 1]) {
      trechos.push({ tipo: TrechoDiffTipoEnum.REMOVIDO, texto: antes[i++] });
    } else {
      trechos.push({ tipo: TrechoDiffTipoEnum.ADICIONADO, texto: depois[j++] });
    }
  }
  while (i < antes.length) trechos.push({ tipo: TrechoDiffTipoEnum.REMOVIDO, texto: antes[i++] });
  while (j < depois.length) trechos.push({ tipo: TrechoDiffTipoEnum.ADICIONADO, texto: depois[j++] });
  return trechos;
}

/**
 * Diff sobreposto por palavra (task 224): a sequência de trechos `IGUAL`, `REMOVIDO` e `ADICIONADO` que, lida sem os `ADICIONADO`, dá o
 * texto de antes e, lida sem os `REMOVIDO`, dá o texto de depois. Espaços e quebras de linha são preservados. Texto muito grande cai
 * para o miolo inteiro trocado (`LIMITE_DE_CELULAS_DO_DIFF_POR_PALAVRA`); nunca trava.
 */
export function compararPorPalavra(textoAntes: string, textoDepois: string): TrechoDiff[] {
  if (textoAntes === textoDepois) return textoAntes === '' ? [] : [{ tipo: TrechoDiffTipoEnum.IGUAL, texto: textoAntes }];

  const antes = separarEmPalavras(textoAntes);
  const depois = separarEmPalavras(textoDepois);

  let inicio = 0;
  while (inicio < antes.length && inicio < depois.length && antes[inicio] === depois[inicio]) inicio++;
  let fimAntes = antes.length;
  let fimDepois = depois.length;
  while (fimAntes > inicio && fimDepois > inicio && antes[fimAntes - 1] === depois[fimDepois - 1]) {
    fimAntes--;
    fimDepois--;
  }

  return juntarTrechos([
    { tipo: TrechoDiffTipoEnum.IGUAL, texto: antes.slice(0, inicio).join('') },
    ...alinharMiolo(antes.slice(inicio, fimAntes), depois.slice(inicio, fimDepois)),
    { tipo: TrechoDiffTipoEnum.IGUAL, texto: antes.slice(fimAntes).join('') },
  ]);
}

/** Há alguma diferença entre os trechos (qualquer coisa que não seja `IGUAL`). */
export function diffTemMudanca(trechos: TrechoDiff[]): boolean {
  return trechos.some((trecho) => trecho.tipo !== TrechoDiffTipoEnum.IGUAL);
}
