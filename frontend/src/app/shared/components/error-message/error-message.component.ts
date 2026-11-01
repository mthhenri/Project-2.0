import { Component, Input } from '@angular/core';
import { MessageModule } from 'primeng/message';

@Component({
    selector: 'app-error-message',
    standalone: true,
    imports: [MessageModule],
    templateUrl: './error-message.component.html',
    styleUrl: './error-message.component.scss',
})
export class ErrorMessageComponent {
    @Input() mensagem: string = '';
    @Input() erros: string[] = [];
}
