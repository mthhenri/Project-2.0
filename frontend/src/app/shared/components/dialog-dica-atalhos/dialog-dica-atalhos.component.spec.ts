import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { DialogDicaAtalhosComponent } from './dialog-dica-atalhos.component';

// Dica do rodapé dos dialogs: com textarea o Enter quebra linha, então quem confirma é o Ctrl+Enter.

const texto = (elemento: HTMLElement) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('DialogDicaAtalhosComponent', () => {
  it('dialog sem textarea ensina que Enter confirma e Esc cancela', async () => {
    const montado = await montarComponente(DialogDicaAtalhosComponent);
    expect(texto(montado.elemento)).toBe('Enter confirma · Esc cancela');
  });

  it('dialog com textarea ensina que Ctrl+Enter confirma e Esc cancela', async () => {
    const montado = await montarComponente(DialogDicaAtalhosComponent, { entradas: { comTextarea: true } });
    expect(texto(montado.elemento)).toBe('Ctrl+Enter confirma · Esc cancela');
  });
});
