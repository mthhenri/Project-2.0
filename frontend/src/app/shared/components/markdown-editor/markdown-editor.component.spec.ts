import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { MarkdownEditorComponent, MenuContextoEditorEvento } from './markdown-editor.component';
import { By } from '@angular/platform-browser';
import type { EditorFormatado } from './markdown-formatado';

// Editor de Markdown (task 134). O interpretador e o editor formatado (Milkdown) têm testes próprios; aqui, o contrato com o formulário
// (ControlValueAccessor), o modo Markdown cru (textarea) e o teclado: Enter é nova linha (continua listas) e Ctrl+Enter não é consumido,
// para o dialog confirmar. O jsdom não tem `document.execCommand`: o editor cai no fallback de atribuir o valor e avisar o `input`.

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MarkdownEditorComponent],
  template: `<app-markdown-editor
    [formControl]="controle"
    [somenteLeitura]="somenteLeitura"
    [emitirMenuContexto]="true"
    [maxlength]="500"
    placeholder="Escreva aqui"
    rotulo="Descrição"
    (keydown.control.enter)="confirmado = controle.value"
    (aoMenuContexto)="menus.push($event)"
  />`,
})
class AnfitriaoComponent {
  controle = new FormControl<string>('', { nonNullable: true });
  somenteLeitura = false;
  confirmado = '';
  menus: MenuContextoEditorEvento[] = [];
}

type Montado = ComponenteMontado<AnfitriaoComponent>;

const campo = (montado: Montado) => montado.elemento.querySelector<HTMLTextAreaElement>('textarea')!;
const botaoPorRotulo = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`)!;

/** Monta o anfitrião já no modo Markdown cru, com o valor inicial do formulário. */
async function montarEmTexto(valorInicial = ''): Promise<Montado> {
  const montado = await montarComponente(AnfitriaoComponent);
  montado.componente.controle.setValue(valorInicial);
  botaoPorRotulo(montado, 'Ver e editar o Markdown cru').click();
  await montado.atualizar();
  return montado;
}

function teclar(alvo: HTMLTextAreaElement, init: KeyboardEventInit): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  alvo.dispatchEvent(evento);
  return evento;
}

function posicionar(alvo: HTMLTextAreaElement, valor: string, inicio: number, fim = inicio): void {
  alvo.value = valor;
  alvo.setSelectionRange(inicio, fim);
}

const execCommandOriginal = (document as unknown as { execCommand?: unknown }).execCommand;
beforeEach(() => {
  (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
});
afterEach(() => {
  (document as unknown as { execCommand?: unknown }).execCommand = execCommandOriginal;
});

describe('MarkdownEditorComponent — modo somente leitura', () => {
  it('mostra só o visualizador, sem barra nem campo de edição', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.setValue('# Título\n\ntexto **forte**');
    montado.componente.somenteLeitura = true;
    montado.fixture.changeDetectorRef.markForCheck();
    await montado.atualizar();

    expect(montado.elemento.querySelector('[role="toolbar"]')).toBeNull();
    expect(montado.elemento.querySelector('textarea')).toBeNull();
    expect(montado.elemento.querySelector('h1')?.textContent).toContain('Título');
    expect(montado.elemento.querySelector('strong')?.textContent).toBe('forte');
  });
});

describe('MarkdownEditorComponent — barra e alternância de modo', () => {
  it('ao digitar no editor formatado o formulário já recebe o texto antes da confirmação imediata', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    const componente = montado.fixture.debugElement.query(By.directive(MarkdownEditorComponent)).componentInstance as unknown as { editorFormatado: EditorFormatado | null };
    await vi.waitFor(() => expect(componente.editorFormatado).not.toBeNull(), { timeout: 8000 });
    componente.editorFormatado!.inserirTexto('Texto recém digitado');
    montado.elemento.querySelector('.ProseMirror')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    expect(montado.componente.confirmado).toBe('Texto recém digitado');
  });

  it('valor externo no editor formatado não dispara outra alteração nem perde a forma original', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    const componente = montado.fixture.debugElement.query(By.directive(MarkdownEditorComponent)).componentInstance as unknown as { editorFormatado: EditorFormatado | null };
    await vi.waitFor(() => expect(componente.editorFormatado).not.toBeNull(), { timeout: 8000 });
    const valores: string[] = [];
    montado.componente.controle.valueChanges.subscribe((valor) => valores.push(valor));
    montado.componente.controle.setValue('texto **externo**');
    expect(valores).toEqual(['texto **externo**']);
    expect(componente.editorFormatado!.obterMarkdown()).toBe('texto **externo**');
    expect(montado.componente.controle.dirty).toBe(false);
  });
  it('começa no modo formatado: barra de formatação com desfazer/refazer e o botão do Markdown cru sem pressão', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    expect(montado.elemento.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(botaoPorRotulo(montado, 'Desfazer')).toBeTruthy();
    expect(botaoPorRotulo(montado, 'Título 1')).toBeTruthy();
    expect(botaoPorRotulo(montado, 'Ver e editar o Markdown cru').getAttribute('aria-pressed')).toBe('false');
    expect(montado.elemento.querySelector('textarea')).toBeNull();
  });

  it('o botão Tabela insere uma tabela com o cursor nela, e só então aparecem os botões de linha e coluna (I-003)', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    const componente = montado.fixture.debugElement.query(By.directive(MarkdownEditorComponent)).componentInstance as unknown as { editorFormatado: EditorFormatado | null };
    await vi.waitFor(() => expect(componente.editorFormatado).not.toBeNull(), { timeout: 8000 });
    expect(botaoPorRotulo(montado, 'Linha abaixo')).toBeNull();

    botaoPorRotulo(montado, 'Tabela').click();
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('.ProseMirror table').length).toBe(1);
    expect(botaoPorRotulo(montado, 'Tabela').getAttribute('aria-pressed')).toBe('true');
    expect(botaoPorRotulo(montado, 'Linha abaixo')).toBeTruthy();
    expect(botaoPorRotulo(montado, 'Excluir tabela')).toBeTruthy();

    botaoPorRotulo(montado, 'Excluir tabela').click();
    await montado.atualizar();
    expect(montado.elemento.querySelector('.ProseMirror table')).toBeNull();
    expect(botaoPorRotulo(montado, 'Linha abaixo')).toBeNull();
  });

  it('"Markdown cru" troca para o textarea (com o valor do formulário) e "Voltar" retorna ao formatado', async () => {
    const montado = await montarEmTexto('um **texto**');
    expect(campo(montado).value).toBe('um **texto**');
    expect(botaoPorRotulo(montado, 'Voltar à edição formatada').getAttribute('aria-pressed')).toBe('true');
    expect(botaoPorRotulo(montado, 'Título')).toBeTruthy();

    botaoPorRotulo(montado, 'Voltar à edição formatada').click();
    await montado.atualizar();
    expect(montado.elemento.querySelector('textarea')).toBeNull();
  });
});

describe('MarkdownEditorComponent — ControlValueAccessor (modo Markdown)', () => {
  it('valor do formulário aparece no campo e o placeholder, o rótulo e o maxlength chegam ao textarea', async () => {
    const montado = await montarEmTexto('olá');
    expect(campo(montado).value).toBe('olá');
    expect(campo(montado).getAttribute('placeholder')).toBe('Escreva aqui');
    expect(campo(montado).getAttribute('aria-label')).toBe('Descrição');
    expect(campo(montado).getAttribute('maxlength')).toBe('500');
  });

  it('valor nulo vira texto vazio', async () => {
    const montado = await montarEmTexto('algo');
    montado.componente.controle.setValue(null as unknown as string);
    await montado.atualizar();
    expect(campo(montado).value).toBe('');
  });

  it('digitar atualiza o valor do formulário e marca como alterado', async () => {
    const montado = await montarEmTexto();
    campo(montado).value = 'novo texto';
    campo(montado).dispatchEvent(new Event('input'));
    await montado.atualizar();

    expect(montado.componente.controle.value).toBe('novo texto');
    expect(montado.componente.controle.dirty).toBe(true);
  });

  it('escrever no formulário não marca o controle como alterado nem emite mudança', async () => {
    const montado = await montarEmTexto();
    montado.componente.controle.setValue('vindo de fora');
    await montado.atualizar();
    expect(campo(montado).value).toBe('vindo de fora');
    expect(montado.componente.controle.dirty).toBe(false);
  });

  it('sair do campo marca o controle como tocado', async () => {
    const montado = await montarEmTexto();
    expect(montado.componente.controle.touched).toBe(false);
    campo(montado).dispatchEvent(new Event('blur'));
    expect(montado.componente.controle.touched).toBe(true);
  });

  it('formulário desabilitado desabilita o campo e os botões da barra', async () => {
    const montado = await montarEmTexto('texto');
    montado.componente.controle.disable();
    await montado.atualizar();

    expect(campo(montado).disabled).toBe(true);
    expect(botaoPorRotulo(montado, 'Negrito').disabled).toBe(true);
  });
});

describe('MarkdownEditorComponent — teclado (modo Markdown)', () => {
  it('Enter em texto comum é nova linha: o editor não impede o comportamento do navegador', async () => {
    const montado = await montarEmTexto('linha simples');
    posicionar(campo(montado), 'linha simples', 5);
    const evento = teclar(campo(montado), { key: 'Enter' });
    expect(evento.defaultPrevented).toBe(false);
  });

  it('Enter ao fim de um item de lista continua a lista com o próximo marcador', async () => {
    const montado = await montarEmTexto('- primeiro');
    posicionar(campo(montado), '- primeiro', 10);
    const evento = teclar(campo(montado), { key: 'Enter' });
    await montado.atualizar();

    expect(evento.defaultPrevented).toBe(true);
    expect(montado.componente.controle.value).toBe('- primeiro\n- ');
  });

  it('Enter em item de lista numerada continua a numeração', async () => {
    const montado = await montarEmTexto('1. um');
    posicionar(campo(montado), '1. um', 5);
    teclar(campo(montado), { key: 'Enter' });
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('1. um\n2. ');
  });

  it('Ctrl+Enter não é consumido pelo editor: continua subindo até o dialog, que confirma', async () => {
    const montado = await montarEmTexto('- item');
    posicionar(campo(montado), '- item', 6);
    const recebidoPeloAncestral = vi.fn();
    montado.elemento.addEventListener('keydown', recebidoPeloAncestral);

    const evento = teclar(campo(montado), { key: 'Enter', ctrlKey: true });

    expect(evento.defaultPrevented).toBe(false);
    expect(recebidoPeloAncestral).toHaveBeenCalledTimes(1);
    expect(montado.componente.controle.value).toBe('- item');
  });

  it('Ctrl+B envolve a seleção em negrito', async () => {
    const montado = await montarEmTexto('palavra');
    posicionar(campo(montado), 'palavra', 0, 7);
    const evento = teclar(campo(montado), { key: 'b', ctrlKey: true });
    await montado.atualizar();

    expect(evento.defaultPrevented).toBe(true);
    expect(montado.componente.controle.value).toBe('**palavra**');
  });

  it('Ctrl+I envolve a seleção em itálico', async () => {
    const montado = await montarEmTexto('palavra');
    posicionar(campo(montado), 'palavra', 0, 7);
    teclar(campo(montado), { key: 'i', ctrlKey: true });
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('*palavra*');
  });

  it('Tab aninha o item de lista e Shift+Tab desfaz o aninhamento', async () => {
    const montado = await montarEmTexto('- a\n- b');
    posicionar(campo(montado), '- a\n- b', 7);
    const aninhar = teclar(campo(montado), { key: 'Tab' });
    await montado.atualizar();
    expect(aninhar.defaultPrevented).toBe(true);
    expect(montado.componente.controle.value).toBe('- a\n  - b');

    posicionar(campo(montado), campo(montado).value, campo(montado).value.length);
    teclar(campo(montado), { key: 'Tab', shiftKey: true });
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('- a\n- b');
  });

  it('com o formulário desabilitado o teclado não altera nada', async () => {
    const montado = await montarEmTexto('- item');
    montado.componente.controle.disable();
    await montado.atualizar();
    posicionar(campo(montado), '- item', 6);
    const evento = teclar(campo(montado), { key: 'Enter' });
    expect(evento.defaultPrevented).toBe(false);
  });
});

describe('MarkdownEditorComponent — barra de botões (modo Markdown)', () => {
  it('Negrito envolve a seleção e Lista prefixa a linha', async () => {
    const montado = await montarEmTexto('palavra');
    posicionar(campo(montado), 'palavra', 0, 7);
    botaoPorRotulo(montado, 'Negrito').click();
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('**palavra**');

    posicionar(campo(montado), 'item', 0, 4);
    botaoPorRotulo(montado, 'Lista').click();
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('- item');
  });
});

describe('MarkdownEditorComponent — menu de contexto', () => {
  it('com trecho selecionado o botão direito vira o evento aoMenuContexto com o trecho (bloco e seleção iguais no Markdown cru) e a posição', async () => {
    const montado = await montarEmTexto('um dois três');
    posicionar(campo(montado), 'um dois três', 3, 7);
    campo(montado).dispatchEvent(new Event('select'));

    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    campo(montado).dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(montado.componente.menus).toHaveLength(1);
    expect(montado.componente.menus[0]).toMatchObject({ inicio: 3, fim: 7, texto: 'dois', selecao: 'dois' });
  });

  it('sem seleção o menu do navegador segue valendo e nada é emitido', async () => {
    const montado = await montarEmTexto('um dois três');
    posicionar(campo(montado), 'um dois três', 3, 3);

    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    campo(montado).dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(false);
    expect(montado.componente.menus).toHaveLength(0);
  });
});
