import { describe, it, expect, vi } from 'vitest';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/kit/prose/state';
import { montarComponente } from '../../../../testes/montar-componente';
import { EditorMensagemComponent } from './editor-mensagem.component';

// O campo de escrever a mensagem do chat (task 218): o editor formatado dentro de uma caixa, com a barra flutuante da seleção. O jsdom não mede texto, então a
// posição da seleção e o foco são dublês (o posicionamento real é conferido ao vivo).

async function montar() {
  const montado = await montarComponente(EditorMensagemComponent, { entradas: { placeholder: 'Escreva aqui', rotulo: 'Mensagem' } });
  await vi.waitFor(async () => {
    await montado.atualizar();
    expect(montado.componente.editor()).not.toBeNull();
  }, { timeout: 8000, interval: 20 });
  const editor = montado.componente.editor()!;
  const editavel = montado.elemento.querySelector<HTMLElement>('.ProseMirror')!;
  const markdowns: string[] = [];
  montado.componente.mudou.subscribe((markdown) => markdowns.push(markdown));

  function selecionar(trecho: string): void {
    editor.acao((contexto) => {
      const view = contexto.get(editorViewCtx);
      let inicio = -1;
      view.state.doc.descendants((no, posicao) => {
        if (inicio < 0 && no.isText && no.text?.includes(trecho)) inicio = posicao + (no.text?.indexOf(trecho) ?? 0);
        return inicio < 0;
      });
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, inicio, inicio + trecho.length)));
    });
  }

  /** Faz de conta que o campo tem o foco e que a seleção está num lugar medido da tela. */
  function comFocoEMedida(): void {
    vi.spyOn(editor, 'temFoco').mockReturnValue(true);
    vi.spyOn(editor, 'retanguloDaSelecao').mockReturnValue({ esquerda: 40, direita: 120, topo: 300, base: 318 });
  }

  const barra = () => montado.elemento.querySelector('.editor-mensagem__barra');
  const botao = (rotulo: string) => montado.elemento.querySelector<HTMLButtonElement>(`.editor-mensagem__barra button[aria-label="${rotulo}"]`)!;
  return { ...montado, editor, editavel, markdowns, selecionar, comFocoEMedida, barra, botao };
}

describe('EditorMensagemComponent', () => {
  it('monta o editor com a dica do campo, e o campo vazio mostra o placeholder', async () => {
    const campo = await montar();
    const caixa = campo.elemento.querySelector('.editor-mensagem')!;
    expect(caixa.getAttribute('data-placeholder')).toBe('Escreva aqui');
    expect(caixa.classList.contains('editor-mensagem--vazio')).toBe(true);

    campo.editor.inserirTexto('oi');
    await campo.atualizar();
    expect(caixa.classList.contains('editor-mensagem--vazio')).toBe(false);
  });

  it('o elemento editável é uma caixa de texto para leitor de tela (papel, rótulo, várias linhas) e leva o ARIA da lista de sugestões', async () => {
    const campo = await montar();
    expect(campo.editavel.getAttribute('role')).toBe('textbox');
    expect(campo.editavel.getAttribute('aria-label')).toBe('Mensagem');
    expect(campo.editavel.getAttribute('aria-multiline')).toBe('true');
    expect(campo.editavel.hasAttribute('aria-controls')).toBe(false);

    campo.fixture.componentRef.setInput('listaControlada', 'sugestoes');
    campo.fixture.componentRef.setInput('opcaoAtiva', 'sugestao-1');
    await campo.atualizar();
    expect(campo.editavel.getAttribute('aria-controls')).toBe('sugestoes');
    expect(campo.editavel.getAttribute('aria-activedescendant')).toBe('sugestao-1');
  });

  it('cada transação atualiza o Markdown na hora e avisa quem escuta (sem esperar o ouvinte atrasado do Milkdown)', async () => {
    const campo = await montar();
    campo.editor.inserirTexto('um');
    expect(campo.componente.texto()).toBe('um');
    campo.editor.inserirTexto(' dois');
    expect(campo.markdowns).toEqual(['um', 'um dois']);
  });

  it('limpar esvazia o campo e avisa o Markdown vazio', async () => {
    const campo = await montar();
    campo.editor.inserirTexto('texto');
    campo.componente.limpar();
    expect(campo.componente.texto()).toBe('');
    expect(campo.editor.obterMarkdown()).toBe('');
    expect(campo.markdowns.at(-1)).toBe('');
  });

  it('as teclas chegam a quem usa o campo ANTES do editor, e cancelá-las impede o editor de tratá-las', async () => {
    const campo = await montar();
    campo.editor.inserirTexto('texto');
    campo.selecionar('texto');
    const vistas: string[] = [];
    campo.componente.teclou.subscribe((evento) => {
      vistas.push(evento.key);
      evento.stopPropagation();
    });
    campo.editavel.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(vistas).toEqual(['b']);
    expect(campo.editor.obterMarkdown()).toBe('texto');
  });

  it('a colagem também chega antes do editor', async () => {
    const campo = await montar();
    const colagens: Event[] = [];
    campo.componente.colou.subscribe((evento) => colagens.push(evento));
    const evento = new Event('paste', { bubbles: true, cancelable: true });
    campo.editavel.dispatchEvent(evento);
    expect(colagens).toEqual([evento]);
  });

  describe('barra flutuante da seleção', () => {
    it('só aparece com texto selecionado e o foco no campo, com os botões de formatação', async () => {
      const campo = await montar();
      campo.comFocoEMedida();
      campo.editor.inserirTexto('uma frase');
      await campo.atualizar();
      expect(campo.barra()).toBeNull();

      campo.selecionar('frase');
      await campo.atualizar();
      expect(campo.barra()).not.toBeNull();
      const rotulos = Array.from(campo.elemento.querySelectorAll('.editor-mensagem__barra button')).map((item) => item.getAttribute('aria-label'));
      expect(rotulos).toEqual(['Negrito', 'Itálico', 'Tachado', 'Código em linha', 'Lista', 'Lista numerada', 'Citação']);
      expect(campo.barra()!.getAttribute('role')).toBe('toolbar');

      campo.editor.acao((contexto) => {
        const view = contexto.get(editorViewCtx);
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2)));
      });
      await campo.atualizar();
      expect(campo.barra()).toBeNull();
    });

    it('sem o foco no campo, ou sem como medir a seleção, a barra não aparece', async () => {
      const campo = await montar();
      campo.editor.inserirTexto('uma frase');
      vi.spyOn(campo.editor, 'temFoco').mockReturnValue(false);
      campo.selecionar('frase');
      await campo.atualizar();
      expect(campo.barra()).toBeNull();

      vi.spyOn(campo.editor, 'temFoco').mockReturnValue(true);
      vi.spyOn(campo.editor, 'retanguloDaSelecao').mockReturnValue(null);
      campo.selecionar('uma');
      await campo.atualizar();
      expect(campo.barra()).toBeNull();
    });

    it('os botões aplicam a formatação à seleção e acendem o que já vale nela, sem tirar o foco do campo', async () => {
      const campo = await montar();
      campo.comFocoEMedida();
      campo.editor.inserirTexto('uma frase');
      campo.selecionar('frase');
      await campo.atualizar();

      const aperto = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      campo.botao('Negrito').dispatchEvent(aperto);
      expect(aperto.defaultPrevented).toBe(true);

      campo.botao('Negrito').click();
      await campo.atualizar();
      expect(campo.editor.obterMarkdown()).toBe('uma **frase**');
      expect(campo.botao('Negrito').getAttribute('aria-pressed')).toBe('true');
      expect(campo.botao('Itálico').getAttribute('aria-pressed')).toBe('false');
      expect(campo.componente.texto()).toBe('uma **frase**');

      campo.botao('Itálico').click();
      await campo.atualizar();
      expect(campo.editor.obterMarkdown()).toBe('uma ***frase***');

      campo.botao('Negrito').click();
      await campo.atualizar();
      expect(campo.editor.obterMarkdown()).toBe('uma *frase*');
    });

    it('tachado, código em linha, lista, lista numerada e citação', async () => {
      const campo = await montar();
      campo.comFocoEMedida();
      campo.editor.inserirTexto('item');
      campo.selecionar('item');
      await campo.atualizar();

      campo.botao('Tachado').click();
      expect(campo.editor.obterMarkdown()).toBe('~~item~~');
      campo.botao('Tachado').click();
      campo.botao('Código em linha').click();
      expect(campo.editor.obterMarkdown()).toBe('`item`');
      campo.botao('Código em linha').click();

      campo.botao('Lista').click();
      expect(campo.editor.obterMarkdown()).toBe('- item');
      campo.botao('Lista numerada').click();
      expect(campo.editor.obterMarkdown()).toBe('1. item');
      campo.botao('Lista numerada').click();
      campo.botao('Citação').click();
      expect(campo.editor.obterMarkdown()).toBe('> item');
    });

    it('fica sobre a seleção e dentro dos limites do campo', async () => {
      const campo = await montar();
      campo.comFocoEMedida();
      campo.editor.inserirTexto('uma frase');
      campo.selecionar('frase');
      await campo.atualizar();
      const estilo = campo.barra() as HTMLElement;
      // A raiz do jsdom mede 0×0: o centro da seleção (80) cai no mínimo permitido (metade da largura da barra).
      expect(parseFloat(estilo.style.left)).toBeGreaterThanOrEqual(116);
      expect(parseFloat(estilo.style.top)).toBe(300 - 6);
    });
  });
});
