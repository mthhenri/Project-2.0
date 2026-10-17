import { Directive, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Subscription } from 'rxjs';

// Inputs de `p-datepicker` ficam de fora: focá-los abre o calendário ao abrir o dialog.
const SELETOR_CAMPO_TEXTO =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]):not(.p-datepicker-input), textarea:not([disabled]):not([readonly])';
const SELETOR_CAMPO_QUALQUER = `${SELETOR_CAMPO_TEXTO}, [role=combobox]:not([aria-disabled=true])`;

/**
 * Contrato de interação único dos dialogs de formulário (task 97). Aplicar no `<p-dialog>`:
 *
 * - **Autofocus**: ao abrir, foca o primeiro campo de texto vazio (ou, se todos têm valor, o
 *   primeiro campo). `[dialogSemAutofocus]` desliga quando o dialog já tem foco próprio.
 * - **Enter** num `<input>` envia (emite `dialogEnviar`); **Ctrl/Cmd+Enter** envia também a
 *   partir de `<textarea>`. Botões, selects e áreas de texto mantêm o Enter nativo.
 * - **Esc** cancela: é o `closeOnEscape` nativo do `p-dialog` (padrão ligado).
 *
 * `[dialogBloqueado]` ignora o atalho enquanto a operação está em andamento (evita duplo envio).
 * O footer do `p-dialog` vive fora do `<form>`, então `(ngSubmit)` não alcança o botão primário:
 * a diretiva chama o mesmo método que o botão.
 */
@Directive({
  selector: 'p-dialog[dialogFormulario]',
  standalone: true,
  exportAs: 'dialogFormulario',
})
export class DialogFormularioDirective implements OnInit, OnDestroy {
  private readonly dialog = inject(Dialog);

  @Input() dialogSemAutofocus = false;
  @Input() dialogBloqueado = false;
  @Output() readonly dialogEnviar = new EventEmitter<void>();

  private readonly assinaturas = new Subscription();
  private containerOuvido: HTMLElement | null = null;
  private readonly aoTeclar = (evento: KeyboardEvent): void => this.tratarTecla(evento);

  constructor() {
    this.assinaturas.add(this.dialog.onShow.subscribe(() => this.aoMostrar()));
    this.assinaturas.add(this.dialog.onHide.subscribe(() => this.pararDeOuvir()));
  }

  /** O foco inicial do `p-dialog` vai ao primeiro focável (um datepicker abriria o calendário): quem foca é esta diretiva. */
  ngOnInit(): void {
    if (!this.dialogSemAutofocus) this.dialog.focusOnShow = false;
  }

  ngOnDestroy(): void {
    this.assinaturas.unsubscribe();
    this.pararDeOuvir();
  }

  /** Refoca o primeiro campo vazio — usado após "Criar e adicionar outra". */
  focar(): void {
    const container = this.dialog.container();
    if (container) setTimeout(() => this.focarPrimeiroCampo(container));
  }

  private aoMostrar(): void {
    const container = this.dialog.container();
    if (!container) return;
    this.pararDeOuvir();
    container.addEventListener('keydown', this.aoTeclar);
    this.containerOuvido = container;
    if (!this.dialogSemAutofocus) setTimeout(() => this.focarQuandoHouverCampo(container));
  }

  /** Dialogs que carregam os dados ao abrir só renderizam o formulário depois: espera (até 3s). */
  private focarQuandoHouverCampo(container: HTMLElement): void {
    if (this.focarPrimeiroCampo(container)) return;
    const observador = new MutationObserver(() => {
      if (this.focarPrimeiroCampo(container)) observador.disconnect();
    });
    observador.observe(container, { childList: true, subtree: true });
    setTimeout(() => observador.disconnect(), 3000);
  }

  private pararDeOuvir(): void {
    this.containerOuvido?.removeEventListener('keydown', this.aoTeclar);
    this.containerOuvido = null;
  }

  private focarPrimeiroCampo(container: HTMLElement): boolean {
    const campoVazio = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(SELETOR_CAMPO_TEXTO))
      .find((campo) => campo.value === '' && campo.offsetParent !== null);
    const alvo = campoVazio
      ?? Array.from(container.querySelectorAll<HTMLElement>(SELETOR_CAMPO_QUALQUER)).find((campo) => campo.offsetParent !== null);
    alvo?.focus();
    return !!alvo;
  }

  private tratarTecla(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' || evento.defaultPrevented || evento.isComposing || evento.shiftKey || evento.altKey) return;
    const alvo = evento.target as HTMLElement | null;
    if (!alvo) return;
    const comControle = evento.ctrlKey || evento.metaKey;
    const eTextarea = alvo.tagName === 'TEXTAREA' || alvo.isContentEditable; // inclui o editor formatado (task 134)
    const eInput = alvo.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio'].includes((alvo as HTMLInputElement).type);
    if (!(eInput || (eTextarea && comControle))) return;
    evento.preventDefault();
    if (this.dialogBloqueado) return;
    this.dialogEnviar.emit();
  }
}
