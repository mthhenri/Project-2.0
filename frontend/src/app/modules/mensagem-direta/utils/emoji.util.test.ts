import { describe, it, expect } from 'vitest';
import { ehReacaoValida } from '@project20/shared';
import { CATEGORIAS_DE_EMOJI, LIMITE_DA_BUSCA_DE_EMOJI, buscarEmojis, normalizarParaBusca } from './emoji.util';

describe('catálogo de emojis', () => {
    it('tem as nove categorias, todas com emojis, e nenhum emoji repetido', () => {
        expect(CATEGORIAS_DE_EMOJI.map((categoria) => categoria.rotulo)).toEqual([
            'Rostos e emoções', 'Pessoas e corpo', 'Animais e natureza', 'Comidas e bebidas', 'Viagens e lugares', 'Atividades', 'Objetos', 'Símbolos', 'Bandeiras',
        ]);
        const todos = CATEGORIAS_DE_EMOJI.flatMap((categoria) => categoria.emojis.map((item) => item.emoji));
        expect(todos.length).toBeGreaterThan(1500);
        expect(new Set(todos).size).toBe(todos.length);
        for (const categoria of CATEGORIAS_DE_EMOJI) expect(categoria.emojis.length, categoria.rotulo).toBeGreaterThan(0);
    });

    it('todo emoji do catálogo é uma reação válida (a service o aceitaria)', () => {
        const recusados = CATEGORIAS_DE_EMOJI.flatMap((categoria) => categoria.emojis).filter((item) => !ehReacaoValida(item.emoji));
        expect(recusados.map((item) => `${item.emoji} ${item.nome}`)).toEqual([]);
    });
});

describe('busca de emoji', () => {
    it('ignora acento, caixa e ordem das palavras', () => {
        expect(normalizarParaBusca('  Coração ')).toBe('coracao');
        const achados = buscarEmojis('CORAÇÃO');
        expect(achados.length).toBeGreaterThan(5);
        expect(achados.some((item) => item.emoji === '❤️')).toBe(true);
        const ordem = buscarEmojis('vermelho coracao').map((item) => item.emoji);
        expect(ordem).toEqual(buscarEmojis('coracao vermelho').map((item) => item.emoji));
        expect(ordem).toContain('❤️');
    });

    it('busca vazia ou sem resultado devolve vazio, e o excesso é cortado', () => {
        expect(buscarEmojis('   ')).toEqual([]);
        expect(buscarEmojis('zzzxxyy')).toEqual([]);
        expect(buscarEmojis('a').length).toBeLessThanOrEqual(LIMITE_DA_BUSCA_DE_EMOJI);
    });
});
