import catalogo from './emoji-catalogo.json';

// O catálogo de emojis do seletor (task 314): todos os emojis por categoria, com o nome em português para a busca. Gerado da base Unicode CLDR do pacote
// `emojibase-data` (idioma `pt`, versão 16); sem as variações de tom de pele (o emoji base serve) e sem as letras regionais soltas. Lógica pura.

/** Um emoji do catálogo: o caractere e o nome em português (`rosto sorridente`). */
export interface EmojiDoCatalogo {
    emoji: string;
    nome: string;
}

export interface CategoriaDeEmoji {
    codigo: string;
    rotulo: string;
    emojis: EmojiDoCatalogo[];
}

type CategoriaBruta = { codigo: string; rotulo: string; emojis: [string, string][] };

export const CATEGORIAS_DE_EMOJI: CategoriaDeEmoji[] = (catalogo as CategoriaBruta[]).map((categoria) => ({
    codigo: categoria.codigo,
    rotulo: categoria.rotulo,
    emojis: categoria.emojis.map(([emoji, nome]) => ({ emoji, nome })),
}));

/** Resultados da busca de emoji: acima disso o painel só mostraria rolagem. */
export const LIMITE_DA_BUSCA_DE_EMOJI = 120;

/** Sem acento, minúscula e sem espaço nas pontas: "Coração" acha "coracao". */
export function normalizarParaBusca(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Os emojis cujo nome contém todas as palavras digitadas (sem acento, em qualquer ordem). Busca vazia devolve vazio. */
export function buscarEmojis(termo: string): EmojiDoCatalogo[] {
    const palavras = normalizarParaBusca(termo).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return [];
    const achados: EmojiDoCatalogo[] = [];
    for (const categoria of CATEGORIAS_DE_EMOJI) {
        for (const item of categoria.emojis) {
            const nome = normalizarParaBusca(item.nome);
            if (palavras.every((palavra) => nome.includes(palavra))) achados.push(item);
            if (achados.length >= LIMITE_DA_BUSCA_DE_EMOJI) return achados;
        }
    }
    return achados;
}
