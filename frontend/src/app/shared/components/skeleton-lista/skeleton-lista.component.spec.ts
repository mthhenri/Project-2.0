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
});
