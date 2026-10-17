import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Dica de atalhos à esquerda do footer dos dialogs de formulário (task 97). */
@Component({
  selector: 'app-dialog-dica-atalhos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dialog-dica-atalhos">
    {{ comTextarea ? 'Ctrl+Enter confirma' : 'Enter confirma' }} · Esc cancela
  </span>`,
  styles: `
    :host { margin-right: auto; display: flex; align-items: center; }
    .dialog-dica-atalhos { font-size: 0.75rem; color: var(--p-text-muted-color); }
    @media (max-width: 640px) { .dialog-dica-atalhos { display: none; } }
  `,
})
export class DialogDicaAtalhosComponent {
  /** `true` quando o dialog tem `<textarea>` (Enter quebra linha; Ctrl+Enter envia). */
  @Input() comTextarea = false;
}
