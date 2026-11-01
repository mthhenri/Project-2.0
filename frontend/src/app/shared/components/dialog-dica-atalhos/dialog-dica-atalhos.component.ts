import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Dica de atalhos à esquerda do footer dos dialogs de formulário (task 97). */
@Component({
    selector: 'app-dialog-dica-atalhos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dialog-dica-atalhos.component.html',
    styleUrl: './dialog-dica-atalhos.component.scss',
})
export class DialogDicaAtalhosComponent {
    /** `true` quando o dialog tem `<textarea>` (Enter quebra linha; Ctrl+Enter envia). */
    @Input() comTextarea = false;
}
