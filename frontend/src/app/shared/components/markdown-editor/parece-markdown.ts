/**
 * Um texto colado como texto puro (sem HTML junto) que traz sinais de Markdown é interpretado pelo editor formatado (P-078): negrito, tachado,
 * código em linha, link, título, lista, citação, cerca de código ou tabela. Texto sem esses sinais segue como texto puro (cada linha um parágrafo),
 * e quem cola um trecho de código no chat é tratado antes, pelo compositor (`pareceCodigo`).
 */
const SINAIS_DE_MARKDOWN: readonly RegExp[] = [
    /\*\*[^*\n]+\*\*/,
    /__[^_\n]+__/,
    /~~[^~\n]+~~/,
    /`[^`\n]+`/,
    /\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)/,
    /^ {0,3}#{1,6}[ \t]+\S/m,
    /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+\S/m,
    /^ {0,3}>[ \t]?\S/m,
    /^ {0,3}(?:`{3}|~{3})/m,
    /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/m,
];

export function pareceMarkdown(texto: string): boolean {
    if (texto.trim() === '') return false;
    return SINAIS_DE_MARKDOWN.some((sinal) => sinal.test(texto));
}
