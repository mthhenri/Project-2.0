import { describe, expect, it, vi } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { EditorCodigoComponent } from './editor-codigo.component';

// O editor de código (task 216): campo com camada de realce e números de linha; Tab, Shift+Tab e Enter seguem as regras puras.

async function montar(valor = '', linguagem: string | null = null) {
  const montado = await montarComponente(EditorCodigoComponent, { entradas: { valor, linguagem } });
  const campo = () => montado.elemento.querySelector<HTMLTextAreaElement>('textarea')!;
  const teclar = (tecla: string, opcoes: KeyboardEventInit = {}) => {
    const evento = new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true, ...opcoes });
    campo().dispatchEvent(evento);
    return evento;
  };
  const digitar = async (texto: string, cursor = texto.length) => {
    campo().value = texto;
    campo().setSelectionRange(cursor, cursor);
    campo().dispatchEvent(new Event('input'));
    await montado.atualizar();
  };
  return { ...montado, campo, teclar, digitar };
}

describe('EditorCodigoComponent', () => {
  it('mostra o valor de entrada no campo, na camada de realce e nos números de linha', async () => {
    const editor = await montar('a\nb\nc');
    expect(editor.campo().value).toBe('a\nb\nc');
    expect(editor.elemento.querySelector('pre code')!.textContent).toBe('a\nb\nc');
    expect(Array.from(editor.elemento.querySelectorAll('.editor-codigo__numero')).map((numero) => numero.textContent?.trim())).toEqual(['1', '2', '3']);
  });

  it('o que o usuário digita vira o valor (o model) e atualiza a camada e os números', async () => {
    const editor = await montar();
    await editor.digitar('const a = 1;\nconst b = 2;');
    expect(editor.componente.valor()).toBe('const a = 1;\nconst b = 2;');
    expect(editor.elemento.querySelectorAll('.editor-codigo__numero')).toHaveLength(2);
    expect(editor.elemento.querySelector('pre code')!.textContent).toBe('const a = 1;\nconst b = 2;');
  });

  it('texto que termina em quebra de linha ganha um caractere na camada, para a última linha vazia ter altura', async () => {
    const editor = await montar();
    await editor.digitar('a\n');
    expect(editor.elemento.querySelector('pre code')!.textContent).toBe('a\n ');
    expect(editor.elemento.querySelectorAll('.editor-codigo__numero')).toHaveLength(2);
  });

  it('Tab recua no cursor e Shift+Tab desfaz; o evento é cancelado (o foco não sai do campo)', async () => {
    const editor = await montar();
    await editor.digitar('ab', 1);
    expect(editor.teclar('Tab').defaultPrevented).toBe(true);
    expect(editor.campo().value).toBe('a  b');
    expect(editor.componente.valor()).toBe('a  b');
    expect(editor.campo().selectionStart).toBe(3);

    await editor.digitar('  x', 3);
    editor.teclar('Tab', { shiftKey: true });
    expect(editor.campo().value).toBe('x');
  });

  it('Tab com várias linhas selecionadas recua todas', async () => {
    const editor = await montar();
    await editor.digitar('a\nb');
    editor.campo().setSelectionRange(0, 3);
    editor.teclar('Tab');
    expect(editor.campo().value).toBe('  a\n  b');
  });

  it('Enter mantém o recuo e abre um nível depois de chave; Shift+Enter, Ctrl+Enter e Esc ficam para quem usa o editor', async () => {
    const editor = await montar();
    await editor.digitar('if (x) {');
    expect(editor.teclar('Enter').defaultPrevented).toBe(true);
    expect(editor.campo().value).toBe('if (x) {\n  ');

    expect(editor.teclar('Enter', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(editor.teclar('Enter', { shiftKey: true }).defaultPrevented).toBe(false);
    expect(editor.teclar('Escape').defaultPrevented).toBe(false);
    expect(editor.campo().value).toBe('if (x) {\n  ');
  });

  it('a rolagem do campo é copiada para a camada de realce e para os números', async () => {
    const editor = await montar(Array.from({ length: 60 }, (_, indice) => `linha ${indice}`).join('\n'));
    const camada = editor.elemento.querySelector<HTMLElement>('.editor-codigo__realce')!;
    const numeros = editor.elemento.querySelector<HTMLElement>('.editor-codigo__numeros')!;
    editor.campo().scrollTop = 40;
    editor.campo().scrollLeft = 12;
    editor.campo().dispatchEvent(new Event('scroll'));
    expect(camada.scrollTop).toBe(editor.campo().scrollTop);
    expect(camada.scrollLeft).toBe(editor.campo().scrollLeft);
    expect(numeros.scrollTop).toBe(editor.campo().scrollTop);
  });

  it('depois de um código colado, a rolagem do campo é copiada de novo quando as camadas já cresceram (sem evento de rolagem)', async () => {
    const editor = await montar('a');
    // Colar leva o cursor ao fim e o campo rola; o evento chega antes de as camadas renderizarem o texto novo, e nenhum outro evento vem depois.
    editor.campo().scrollTop = 80;
    await editor.digitar(Array.from({ length: 60 }, (_, indice) => `linha ${indice}`).join('\n'));
    const camada = editor.elemento.querySelector<HTMLElement>('.editor-codigo__realce')!;
    const numeros = editor.elemento.querySelector<HTMLElement>('.editor-codigo__numeros')!;
    expect(camada.scrollTop).toBe(editor.campo().scrollTop);
    expect(numeros.scrollTop).toBe(editor.campo().scrollTop);
  });

  it('linguagem conhecida realça com spans por tipo (as mesmas classes de tipo do bloco enviado) e o texto continua idêntico', async () => {
    const editor = await montar('function soma(a) { return a; } // fim', 'ts');
    await vi.waitFor(() => expect(editor.componente['realcar']()).not.toBeNull(), { timeout: 5000 });
    await editor.atualizar();
    expect(editor.elemento.querySelector('.editor-codigo__token--keyword')?.textContent).toBe('function');
    expect(editor.elemento.querySelector('.editor-codigo__token--comment')?.textContent).toBe('// fim');
    expect(editor.elemento.querySelector('pre code')!.textContent).toBe('function soma(a) { return a; } // fim');
  });

  it('sem linguagem, ou desconhecida, não há realce e o texto aparece como está', async () => {
    const editor = await montar('function soma() {}', 'cobol');
    expect(editor.componente['realcar']()).toBeNull();
    expect(editor.elemento.querySelector('[class*="editor-codigo__token"]')).toBeNull();
    expect(editor.elemento.querySelector('pre code')!.textContent).toBe('function soma() {}');
  });

  it('o realce acompanha a troca de linguagem sem remontar o editor', async () => {
    const editor = await montar('const a = 1;', null);
    expect(editor.elemento.querySelector('[class*="editor-codigo__token"]')).toBeNull();
    editor.fixture.componentRef.setInput('linguagem', 'js');
    await editor.atualizar();
    await vi.waitFor(() => expect(editor.componente['realcar']()).not.toBeNull(), { timeout: 5000 });
    await editor.atualizar();
    expect(editor.elemento.querySelector('.editor-codigo__token--keyword')?.textContent).toBe('const');
  });

  it('as camadas de trás não são lidas por leitor de tela; o campo tem o rótulo', async () => {
    const editor = await montar('x');
    expect(editor.elemento.querySelector('pre')!.getAttribute('aria-hidden')).toBe('true');
    expect(editor.elemento.querySelector('.editor-codigo__numeros')!.getAttribute('aria-hidden')).toBe('true');
    expect(editor.campo().getAttribute('aria-label')).toBe('Código');
  });
});
