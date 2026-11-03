import { MARCA_AJUDA_NAO_PODE, MARCA_AJUDA_PODE } from '@project20/shared';

/** Um pedaço do texto de ajuda de um tipo: um título, um parágrafo em Markdown ou uma sequência de linhas "✓ pode" e "✕ não pode". */
export type TrechoDaAjuda =
    | { tipo: 'titulo'; texto: string }
    | { tipo: 'markdown'; texto: string }
    | { tipo: 'itens'; itens: Array<{ pode: boolean; texto: string }> };

const TITULO = /^#{1,6}\s+(.*)$/;

/**
 * Divide o texto de ajuda (Markdown) em trechos para a tela. As linhas que começam com `✓` ou `✕` viram itens com o ícone pintado; `#` a `######`
 * viram título; o resto (separado por linha em branco) segue como Markdown comum. Não há estrutura gravada: a tela só reconhece as marcas.
 */
export function dividirTextoDaAjuda(texto: string): TrechoDaAjuda[] {
    const trechos: TrechoDaAjuda[] = [];
    let paragrafo: string[] = [];

    const fecharParagrafo = (): void => {
        if (paragrafo.length > 0) trechos.push({ tipo: 'markdown', texto: paragrafo.join('\n') });
        paragrafo = [];
    };
    const adicionarItem = (pode: boolean, conteudo: string): void => {
        const ultimo = trechos[trechos.length - 1];
        if (ultimo?.tipo === 'itens') ultimo.itens.push({ pode, texto: conteudo });
        else trechos.push({ tipo: 'itens', itens: [{ pode, texto: conteudo }] });
    };

    for (const linhaBruta of texto.split(/\r?\n/)) {
        const linha = linhaBruta.trim();
        if (linha.length === 0) {
            fecharParagrafo();
            continue;
        }
        const titulo = TITULO.exec(linha);
        if (titulo) {
            fecharParagrafo();
            trechos.push({ tipo: 'titulo', texto: titulo[1].trim() });
        } else if (linha.startsWith(MARCA_AJUDA_PODE) || linha.startsWith(MARCA_AJUDA_NAO_PODE)) {
            fecharParagrafo();
            adicionarItem(linha.startsWith(MARCA_AJUDA_PODE), linha.slice(1).trim());
        } else {
            paragrafo.push(linha);
        }
    }
    fecharParagrafo();
    return trechos;
}

/**
 * Põe a marca no começo da linha em que está o cursor (botões `✓` e `✕` do editor): se a linha já tem uma marca, troca por esta. Devolve o
 * texto novo e onde o cursor fica (no mesmo ponto lógico da linha).
 */
export function inserirMarcaNaLinha(texto: string, cursor: number, marca: string): { texto: string; cursor: number } {
    const inicio = cursor === 0 ? 0 : texto.lastIndexOf('\n', cursor - 1) + 1;
    const resto = texto.slice(inicio);
    const jaTemMarca = resto.startsWith(MARCA_AJUDA_PODE) || resto.startsWith(MARCA_AJUDA_NAO_PODE);
    if (jaTemMarca) {
        const espacoDepois = resto.charAt(1) === ' ' ? 2 : 1;
        const novo = `${texto.slice(0, inicio)}${marca} ${resto.slice(espacoDepois)}`;
        return { texto: novo, cursor: Math.max(cursor + (2 - espacoDepois), inicio + 2) };
    }
    return { texto: `${texto.slice(0, inicio)}${marca} ${resto}`, cursor: cursor + 2 };
}
