import { Component, input, output } from '@angular/core';

/**
 * As sugestões de mensagem do ChatIA (task 496): tocar numa já a envia (por isso o aviãozinho). Acima do campo ficam numa linha
 * só, que rola na horizontal com um fade do lado que ainda tem o que rolar; no estado vazio (`centro`) quebram a linha no meio.
 */
@Component({
    selector: 'app-chat-sugestoes',
    standalone: true,
    templateUrl: './sugestoes.component.html',
    styleUrl: './sugestoes.component.scss',
})
export class SugestoesComponent {
    readonly sugestoes = input.required<readonly string[]>();
    readonly centro = input(false);
    readonly escolhida = output<string>();
}
