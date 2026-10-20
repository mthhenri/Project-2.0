import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { GraficoBarrasCategoria, GraficoBarrasComponent } from './grafico-barras.component';

// Gráfico de barras em SVG (task 199): escalas do d3, desenho do template.

const categorias = (valores: number[][]): GraficoBarrasCategoria[] =>
  valores.map((grupo, indice) => ({
    rotulo: `C${indice + 1}`,
    descricao: `Categoria ${indice + 1}`,
    barras: grupo.map((valor, posicao) => ({ valor, cor: posicao === 0 ? '#336699' : '#999999', rotulo: `${valor}h`, descricao: `Valor ${valor}` })),
  }));

async function montar(entradas: Record<string, unknown>) {
  return montarComponente(GraficoBarrasComponent, { entradas });
}

describe('GraficoBarrasComponent', () => {
  it('desenha uma barra por valor e um rótulo de eixo por categoria', async () => {
    const montado = await montar({ categorias: categorias([[10, 20], [5, 8]]) });
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('.grafico-barras__barra')).toHaveLength(4);
    expect(montado.elemento.querySelectorAll('.grafico-barras__rotulo')).toHaveLength(2);
    expect(montado.elemento.textContent).toContain('C1');
  });

  it('a barra maior é a mais alta e a de valor zero tem altura zero', async () => {
    const montado = await montar({ categorias: categorias([[0], [10], [20]]) });
    await montado.atualizar();
    const alturas = Array.from(montado.elemento.querySelectorAll('.grafico-barras__barra')).map((barra) => Number(barra.getAttribute('height')));
    expect(alturas[0]).toBe(0);
    expect(alturas[1]).toBeGreaterThan(0);
    expect(alturas[2]).toBeGreaterThan(alturas[1]);
  });

  it('cada barra leva o tooltip e a cor recebida', async () => {
    const montado = await montar({ categorias: categorias([[10, 20]]) });
    await montado.atualizar();
    const [primeira, segunda] = Array.from(montado.elemento.querySelectorAll<SVGRectElement>('.grafico-barras__barra'));
    expect(primeira.querySelector('title')?.textContent).toBe('Valor 10');
    expect(primeira.style.fill).toContain('51, 102, 153');
    expect(segunda.querySelector('title')?.textContent).toBe('Valor 20');
  });

  it('a linha de referência só é desenhada quando há valor, e o eixo a comporta mesmo acima das barras', async () => {
    const montado = await montar({ categorias: categorias([[10]]) });
    await montado.atualizar();
    expect(montado.elemento.querySelector('.grafico-barras__referencia')).toBeNull();
    const alturaSem = Number(montado.elemento.querySelector('.grafico-barras__barra')?.getAttribute('height'));

    montado.fixture.componentRef.setInput('linhaReferencia', 100);
    montado.fixture.componentRef.setInput('rotuloLinhaReferencia', 'esperado');
    await montado.atualizar();
    expect(montado.elemento.querySelector('.grafico-barras__referencia')).not.toBeNull();
    expect(montado.elemento.textContent).toContain('esperado');
    const alturaCom = Number(montado.elemento.querySelector('.grafico-barras__barra')?.getAttribute('height'));
    expect(alturaCom).toBeLessThan(alturaSem);
  });

  it('sem categorias não quebra e o eixo continua com marcas', async () => {
    const montado = await montar({ categorias: [] });
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('.grafico-barras__barra')).toHaveLength(0);
    expect(montado.elemento.querySelectorAll('.grafico-barras__grade').length).toBeGreaterThan(0);
  });

  it('descrição geral vira o aria-label do gráfico, e o sufixo do eixo aparece nas marcas', async () => {
    const montado = await montar({ categorias: categorias([[10]]), descricaoGeral: 'Horas por projeto', unidadeDoEixo: ' h' });
    await montado.atualizar();
    expect(montado.elemento.querySelector('svg')?.getAttribute('aria-label')).toBe('Horas por projeto');
    expect(montado.elemento.querySelector('.grafico-barras__marca')?.textContent).toContain(' h');
  });

  it('barra com destaque ganha a classe de contorno e o valor em vermelho', async () => {
    const lista = categorias([[10, 20]]);
    lista[0].barras[1].destaque = true;
    const montado = await montar({ categorias: lista });
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('.grafico-barras__barra--destaque')).toHaveLength(1);
    expect(montado.elemento.querySelectorAll('.grafico-barras__valor--destaque')).toHaveLength(1);
  });

  it('rótulo de valor vazio não desenha texto', async () => {
    const lista = categorias([[10]]);
    lista[0].barras[0].rotulo = '';
    const montado = await montar({ categorias: lista });
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('.grafico-barras__valor')).toHaveLength(0);
  });
});
