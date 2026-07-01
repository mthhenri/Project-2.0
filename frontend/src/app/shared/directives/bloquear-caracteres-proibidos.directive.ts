import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { removerCaracteresProibidos } from '@project20/shared';

/**
 * Impede a entrada de caracteres proibidos (`'  "  \`  ~  ^  \`) em `<input>`/`<textarea>`.
 * Ouve o evento `input` (cobre digitação, colagem e arrastar-soltar): remove os
 * caracteres proibidos, reescreve o valor no `FormControl` (quando há Reactive Forms)
 * e restaura a posição do cursor. A regex mora numa fonte única no `shared`
 * (`removerCaracteresProibidos`); esta diretiva apenas a aplica na camada de UI.
 */
@Directive({
  selector: '[appBloquearCaracteresProibidos]',
  standalone: true,
})
export class BloquearCaracteresProibidosDirective {
  private readonly elementoRef = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });

  @HostListener('input')
  aoDigitar(): void {
    const elemento = this.elementoRef.nativeElement;
    const valorOriginal = elemento.value;
    const valorLimpo = removerCaracteresProibidos(valorOriginal);
    if (valorLimpo === valorOriginal) return;

    // Cursor após a inserção; desconta os caracteres removidos antes dele para
    // mantê-lo no mesmo ponto lógico do texto após a limpeza.
    const posicao = elemento.selectionStart ?? valorLimpo.length;
    const prefixoOriginal = valorOriginal.slice(0, posicao);
    const removidosAntes = prefixoOriginal.length - removerCaracteresProibidos(prefixoOriginal).length;
    const novaPosicao = posicao - removidosAntes;

    if (this.ngControl?.control) {
      this.ngControl.control.setValue(valorLimpo);
    } else {
      elemento.value = valorLimpo;
    }
    elemento.setSelectionRange(novaPosicao, novaPosicao);
  }
}
