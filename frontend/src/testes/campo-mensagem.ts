import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { expect, vi } from 'vitest';
import { MensagemDiretaEditorMensagemComponent } from '../app/modules/mensagem-direta/components/mensagem-direta-editor-mensagem/mensagem-direta-editor-mensagem.component';

// Ajudantes dos testes que escrevem no campo de mensagem do chat entre colaboradores (task 218). O campo é o editor formatado (Milkdown), carregado
// sob demanda: antes de usá-lo o teste espera ele montar, e escreve pela API dele (o jsdom não digita de verdade). O elemento editável é o `.ProseMirror`.

/** O componente do campo de mensagem que está na tela, ou `null`. */
export function campoDeMensagemOuNulo(fixture: ComponentFixture<unknown>): MensagemDiretaEditorMensagemComponent | null {
  return (fixture.debugElement.query(By.directive(MensagemDiretaEditorMensagemComponent))?.componentInstance as MensagemDiretaEditorMensagemComponent | undefined) ?? null;
}

export function campoDeMensagem(fixture: ComponentFixture<unknown>): MensagemDiretaEditorMensagemComponent {
  const campo = campoDeMensagemOuNulo(fixture);
  if (!campo) throw new Error('O campo de mensagem não está na tela');
  return campo;
}

/** Espera o editor do campo montar (ele carrega por `import()`), redesenhando a tela enquanto isso. */
export async function esperarCampoDeMensagem(fixture: ComponentFixture<unknown>, atualizar: () => Promise<void>): Promise<void> {
  await vi.waitFor(
    async () => {
      await atualizar();
      expect(campoDeMensagemOuNulo(fixture)?.editor() ?? null).not.toBeNull();
    },
    { timeout: 8000, interval: 20 },
  );
}

/** O elemento editável do campo (onde o teclado e a colagem chegam). */
export function editavelDaMensagem(fixture: ComponentFixture<unknown>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ProseMirror')!;
}

/** Troca o texto do campo por `texto` (com o cursor no fim), como se o usuário tivesse apagado tudo e digitado. */
export function digitarNaMensagem(fixture: ComponentFixture<unknown>, texto: string): void {
  const campo = campoDeMensagem(fixture);
  campo.limpar();
  if (texto !== '') campo.editor()!.inserirTexto(texto);
}

export function teclarNaMensagem(fixture: ComponentFixture<unknown>, tecla: string, opcoes: KeyboardEventInit = {}): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true, ...opcoes });
  editavelDaMensagem(fixture).dispatchEvent(evento);
  return evento;
}

/** Uma colagem de texto puro no campo. */
export function colarNaMensagem(fixture: ComponentFixture<unknown>, texto: string): Event {
  const evento = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(evento, 'clipboardData', { value: { getData: (tipo: string) => (tipo === 'text/html' ? '' : texto), files: [], types: ['text/plain'] } });
  editavelDaMensagem(fixture).dispatchEvent(evento);
  return evento;
}

/** O Markdown que o campo guarda agora. */
export function textoDaMensagem(fixture: ComponentFixture<unknown>): string {
  return campoDeMensagem(fixture).texto();
}
