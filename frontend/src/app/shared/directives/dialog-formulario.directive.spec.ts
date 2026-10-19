import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { montarComponente } from '../../../testes/montar-componente';
import { DialogFormularioDirective } from './dialog-formulario.directive';

@Component({
  selector: 'app-host-dialog',
  imports: [DialogModule, DialogFormularioDirective],
  template: `
    <p-dialog
      dialogFormulario
      header="Novo"
      [visible]="visivel()"
      [dialogSemAutofocus]="semAutofocus()"
      [dialogBloqueado]="bloqueado()"
      (dialogEnviar)="enviados = enviados + 1"
    >
      <input aria-label="nome" value="preenchido" />
      <input aria-label="descricao" />
      <input aria-label="oculto" type="hidden" />
      <input aria-label="desabilitado" disabled />
      <textarea aria-label="texto"></textarea>
      <button type="button" aria-label="botao">Salvar</button>
    </p-dialog>
  `,
})
class HostDialogComponent {
  readonly visivel = signal(false);
  readonly semAutofocus = signal(false);
  readonly bloqueado = signal(false);
  enviados = 0;
}

// O jsdom não calcula layout: `offsetParent` é sempre null e a diretiva trataria todo campo como invisível.
// Aqui, um elemento está "visível" quando não é `type=hidden`.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute('type') === 'hidden' ? null : this.parentElement;
    },
  });
});

afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)['offsetParent'];
  vi.useRealTimers();
});

/** O foco inicial só ocorre depois do `onShow` + um `setTimeout`. */
async function abrir(host: Awaited<ReturnType<typeof montarComponente<HostDialogComponent>>>): Promise<void> {
  host.componente.visivel.set(true);
  await host.atualizar();
  await new Promise((resolver) => setTimeout(resolver, 20));
  await host.atualizar();
}

const campo = (nome: string): HTMLElement => document.querySelector<HTMLElement>(`[aria-label="${nome}"]`)!;

function teclar(alvo: HTMLElement, opcoes: KeyboardEventInit): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...opcoes });
  alvo.dispatchEvent(evento);
  return evento;
}

describe('DialogFormularioDirective', () => {
  it('Enter num input envia e impede o comportamento nativo', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    const evento = teclar(campo('nome'), {});

    expect(host.componente.enviados).toBe(1);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('Enter num textarea mantém o nativo (quebra de linha); Ctrl+Enter e Cmd+Enter enviam', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    const simples = teclar(campo('texto'), {});
    expect(host.componente.enviados).toBe(0);
    expect(simples.defaultPrevented).toBe(false);

    teclar(campo('texto'), { ctrlKey: true });
    teclar(campo('texto'), { metaKey: true });
    expect(host.componente.enviados).toBe(2);
  });

  it('Enter num botão não envia', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    const evento = teclar(campo('botao'), {});

    expect(host.componente.enviados).toBe(0);
    expect(evento.defaultPrevented).toBe(false);
  });

  it('Shift+Enter e Alt+Enter são ignorados', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    teclar(campo('nome'), { shiftKey: true });
    teclar(campo('nome'), { altKey: true });

    expect(host.componente.enviados).toBe(0);
  });

  it('outras teclas não enviam', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    teclar(campo('nome'), { key: 'a' });

    expect(host.componente.enviados).toBe(0);
  });

  it('evento já cancelado por outro tratador não envia', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);
    campo('nome').addEventListener('keydown', (evento) => evento.preventDefault());

    teclar(campo('nome'), {});

    expect(host.componente.enviados).toBe(0);
  });

  it('com dialogBloqueado, o Enter é consumido mas não envia (evita duplo envio)', async () => {
    const host = await montarComponente(HostDialogComponent);
    host.componente.bloqueado.set(true);
    await abrir(host);

    const evento = teclar(campo('nome'), {});

    expect(host.componente.enviados).toBe(0);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('ao fechar, para de ouvir o teclado', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);
    const alvo = campo('nome');

    host.componente.visivel.set(false);
    await host.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 20));
    teclar(alvo, {});

    expect(host.componente.enviados).toBe(0);
  });

  it('ao abrir, foca o primeiro campo de texto vazio (pulando preenchido, oculto e desabilitado)', async () => {
    const host = await montarComponente(HostDialogComponent);
    await abrir(host);

    expect(document.activeElement).toBe(campo('descricao'));
  });

  it('com dialogSemAutofocus, a diretiva não move o foco', async () => {
    const host = await montarComponente(HostDialogComponent);
    host.componente.semAutofocus.set(true);
    await host.atualizar();
    await abrir(host);

    expect(document.activeElement).not.toBe(campo('descricao'));
  });
});
