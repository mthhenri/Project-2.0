import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { SkeletonListaComponent } from './skeleton-lista.component';

// Esqueleto da primeira carga: reserva o espaço do conteúdo real conforme a variante, a quantidade e as colunas.

const blocos = (elemento: HTMLElement) => elemento.querySelectorAll('p-skeleton').length;

describe('SkeletonListaComponent', () => {
    it('anuncia "Carregando…" como status ocupado para leitores de tela', async () => {
        const montado = await montarComponente(SkeletonListaComponent);
        const status = montado.elemento.querySelector('[role="status"]');
        expect(status?.getAttribute('aria-busy')).toBe('true');
        expect(status?.textContent).toContain('Carregando…');
    });

    it('tabela padrão: cabeçalho e 6 linhas de 5 colunas', async () => {
        const montado = await montarComponente(SkeletonListaComponent);
        expect(blocos(montado.elemento)).toBe(5 + 6 * 5);
    });

    it('tabela respeita quantidade de linhas e de colunas', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { quantidade: 3, colunas: 2 } });
        expect(blocos(montado.elemento)).toBe(2 + 3 * 2);
    });

    it('quantidade e colunas nunca ficam abaixo de 1', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { quantidade: 0, colunas: -4 } });
        expect(blocos(montado.elemento)).toBe(1 + 1 * 1);
    });

    it('cartões: um bloco por item', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'cartoes', quantidade: 4 } });
        expect(blocos(montado.elemento)).toBe(4);
    });

    it('linhas: dois blocos por item (título e etiqueta)', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'linhas', quantidade: 3 } });
        expect(blocos(montado.elemento)).toBe(6);
    });

    it('com cabeçalhos mostra os rótulos reais como texto e usa o número deles como colunas', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { cabecalhos: ['Usuário', 'Cargo', ''], quantidade: 2 } });
        const rotulos = Array.from(montado.elemento.querySelectorAll('.skeleton-lista__rotulo')).map((no) => no.textContent);
        expect(rotulos).toEqual(['Usuário', 'Cargo', '']);
        // A coluna sem rótulo fica vazia no cabeçalho (como o `th` real); as linhas têm uma célula por cabeçalho.
        expect(montado.elemento.querySelectorAll('.skeleton-lista__rotulo').length).toBe(3);
        expect(blocos(montado.elemento)).toBe(2 * 3);
    });

    it('larguras e altura da linha reais vão para a grade e para a altura mínima', async () => {
        const montado = await montarComponente(SkeletonListaComponent, {
            entradas: { cabecalhos: ['A', 'B'], larguras: 'minmax(0, 2fr) minmax(0, 1fr)', alturaLinha: '3.25rem', quantidade: 1 },
        });
        const linhas = montado.elemento.querySelectorAll<HTMLElement>('.skeleton-lista__linha');
        expect(linhas[0].style.gridTemplateColumns).toBe('minmax(0, 2fr) minmax(0, 1fr)');
        expect(linhas[1].style.minHeight).toBe('3.25rem');
    });

    it('cartões usam a largura mínima e a altura informadas', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'cartoes', quantidade: 2, larguraMinima: '28rem', alturaCartao: '8.6rem' } });
        const grade = montado.elemento.querySelector<HTMLElement>('.skeleton-lista__grade');
        expect(grade?.style.gridTemplateColumns).toContain('minmax(28rem, 1fr)');
        expect(montado.elemento.querySelector<HTMLElement>('p-skeleton')?.style.height || montado.elemento.querySelector('p-skeleton')?.getAttribute('height')).toBeTruthy();
    });

    it('formas das células: avatar, selo, interruptor, ícones, caixa e duas linhas mudam a estrutura da linha', async () => {
        const montado = await montarComponente(SkeletonListaComponent, {
            entradas: {
                cabecalhos: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
                formas: ['avatar', 'duplo', 'selo', 'interruptor', 'icones', 'caixa', 'icone'],
                quantidade: 1,
            },
        });
        const linha = montado.elemento.querySelectorAll('.skeleton-lista__linha')[1];
        expect(linha.querySelectorAll('.skeleton-lista__avatar p-skeleton').length).toBe(2);
        expect(linha.querySelectorAll('.skeleton-lista__pilha p-skeleton').length).toBe(2);
        expect(linha.querySelectorAll('.skeleton-lista__icones p-skeleton').length).toBe(3);
        // avatar (2) + duplo (2) + selo (1) + interruptor (1) + ícones (3) + caixa (1) + ícone (1)
        expect(linha.querySelectorAll('p-skeleton').length).toBe(11);
    });

    it('sem formas, cada célula é um bloco de texto', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { cabecalhos: ['A', 'B'], quantidade: 1 } });
        expect(montado.elemento.querySelectorAll('.skeleton-lista__linha')[1].querySelectorAll('p-skeleton').length).toBe(2);
    });

    it('cartões usam o espaçamento informado', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'cartoes', quantidade: 2, espacamento: '10px' } });
        expect(montado.elemento.querySelector<HTMLElement>('.skeleton-lista__grade')?.style.gap).toBe('10px');
    });

    it('linhas com altura real não têm espaço entre si', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'linhas', quantidade: 2, alturaLinha: '2rem' } });
        expect(montado.elemento.querySelector<HTMLElement>('.skeleton-lista')?.style.gap).toMatch(/^0(px)?$/);
    });

    it('linhas sem altura real mantêm o espaçamento padrão', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { variante: 'linhas', quantidade: 2 } });
        expect(montado.elemento.querySelector<HTMLElement>('.skeleton-lista')?.style.gap).toBe('');
    });

    it('largura mínima da tabela: cabeçalho e linhas têm a largura da tabela real e o esqueleto rola em vez de espremer', async () => {
        const montado = await montarComponente(SkeletonListaComponent, { entradas: { cabecalhos: ['A', 'B'], quantidade: 1, larguraMinimaTabela: '60rem' } });
        const linhas = montado.elemento.querySelectorAll<HTMLElement>('.skeleton-lista__linha');
        expect(linhas[0].style.minWidth).toBe('60rem');
        expect(linhas[1].style.minWidth).toBe('60rem');
        expect(montado.elemento.querySelector<HTMLElement>('.skeleton-lista')?.style.overflowX).toBe('auto');
    });
});
