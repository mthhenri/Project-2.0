import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { DiffPorPalavraComponent } from './diff-por-palavra.component';

// Diff por palavra (task 224): o texto uma vez só, com o removido riscado e o adicionado destacado.

const removidos = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll('del')).map((item) => item.textContent);
const adicionados = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll('ins')).map((item) => item.textContent);

describe('DiffPorPalavraComponent', () => {
  it('mostra o texto uma vez só, com o que saiu riscado e o que entrou destacado', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, { entradas: { antes: 'enviar proposta ao cliente', depois: 'enviar contrato ao cliente' } });
    expect(removidos(montado.elemento)).toEqual(['proposta']);
    expect(adicionados(montado.elemento)).toEqual(['contrato']);
    expect(montado.elemento.textContent?.replace(/\s+/g, ' ').trim()).toBe('enviar propostacontrato ao cliente');
  });

  it('sem mudança não risca nem destaca nada e marca semMudanca', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, { entradas: { antes: 'texto igual', depois: 'texto igual' } });
    expect(removidos(montado.elemento)).toEqual([]);
    expect(adicionados(montado.elemento)).toEqual([]);
    expect(montado.componente.semMudanca()).toBe(true);
  });

  it('antes vazio é tudo adicionado', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, { entradas: { antes: '', depois: 'texto novo' } });
    expect(adicionados(montado.elemento)).toEqual(['texto novo']);
  });

  it('depois vazio é tudo removido', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, { entradas: { antes: 'texto velho', depois: null } });
    expect(removidos(montado.elemento)).toEqual(['texto velho']);
  });

  it('o código usa a variante monoespaçada e mantém a indentação e as quebras de linha', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, {
      entradas: { antes: 'if (a) {\n  fazer();\n}', depois: 'if (a) {\n  fazerTudo();\n}', codigo: true },
    });
    expect(montado.elemento.querySelector('.diff-por-palavra--codigo')).not.toBeNull();
    expect(montado.elemento.textContent).toContain('if (a) {\n  ');
    expect(removidos(montado.elemento)).toEqual(['fazer();']);
    expect(adicionados(montado.elemento)).toEqual(['fazerTudo();']);
  });

  it('o texto fora do modo código não ganha a variante monoespaçada', async () => {
    const montado = await montarComponente(DiffPorPalavraComponent, { entradas: { antes: 'a', depois: 'b' } });
    expect(montado.elemento.querySelector('.diff-por-palavra--codigo')).toBeNull();
  });
});
