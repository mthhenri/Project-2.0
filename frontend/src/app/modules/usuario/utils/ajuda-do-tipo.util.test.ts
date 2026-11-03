import { describe, it, expect } from 'vitest';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { dividirTextoDaAjuda, inserirMarcaNaLinha } from './ajuda-do-tipo.util';

describe('dividirTextoDaAjuda', () => {
    it('separa frase, títulos e as linhas com ✓ e ✕, agrupando as seguidas', () => {
        const trechos = dividirTextoDaAjuda('Quem executa.\n\n### Pode\n✓ Um\n✓ Dois\n\n### Não pode\n✕ Três');
        expect(trechos).toEqual([
            { tipo: 'markdown', texto: 'Quem executa.' },
            { tipo: 'titulo', texto: 'Pode' },
            { tipo: 'itens', itens: [{ pode: true, texto: 'Um' }, { pode: true, texto: 'Dois' }] },
            { tipo: 'titulo', texto: 'Não pode' },
            { tipo: 'itens', itens: [{ pode: false, texto: 'Três' }] },
        ]);
    });

    it('✓ e ✕ juntos na mesma sequência ficam no mesmo grupo, cada um com a sua marca', () => {
        expect(dividirTextoDaAjuda('✓ a\n✕ b')).toEqual([{ tipo: 'itens', itens: [{ pode: true, texto: 'a' }, { pode: false, texto: 'b' }] }]);
    });

    it('linhas comuns seguidas formam um parágrafo e a linha em branco o fecha; texto vazio não gera nada', () => {
        expect(dividirTextoDaAjuda('um\ndois\n\ntrês')).toEqual([{ tipo: 'markdown', texto: 'um\ndois' }, { tipo: 'markdown', texto: 'três' }]);
        expect(dividirTextoDaAjuda('  \n')).toEqual([]);
    });

    it('reconhece o texto padrão de todo tipo: tem item de pode e de não pode', () => {
        for (const tipo of Object.values(TipoUsuarioEnum)) {
            const itens = dividirTextoDaAjuda(DESCRICAO_TIPO_USUARIO[tipo]).flatMap((trecho) => (trecho.tipo === 'itens' ? trecho.itens : []));
            expect(itens.some((item) => item.pode)).toBe(true);
            expect(itens.some((item) => !item.pode)).toBe(true);
        }
    });
});

describe('inserirMarcaNaLinha', () => {
    it('põe a marca no começo da linha do cursor', () => {
        expect(inserirMarcaNaLinha('um\ndois', 5, '✓')).toEqual({ texto: 'um\n✓ dois', cursor: 7 });
        expect(inserirMarcaNaLinha('um', 2, '✕')).toEqual({ texto: '✕ um', cursor: 4 });
    });

    it('troca a marca que a linha já tem, sem duplicar', () => {
        expect(inserirMarcaNaLinha('✓ item', 3, '✕').texto).toBe('✕ item');
    });

    it('em linha vazia insere a marca e o cursor fica depois dela', () => {
        expect(inserirMarcaNaLinha('a\n', 2, '✓')).toEqual({ texto: 'a\n✓ ', cursor: 4 });
    });
});
