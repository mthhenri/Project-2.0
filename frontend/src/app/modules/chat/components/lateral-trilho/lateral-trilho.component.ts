import { Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

/**
 * A lateral do ChatIA recolhida (task 496): um trilho fino na borda direita com "Minhas demandas" e quantas estão em aberto;
 * tocar nele reabre o que estava (a lista ou a demanda). Com a lateral embaixo da conversa, vira uma faixa horizontal.
 */
@Component({
    selector: 'app-chat-lateral-trilho',
    standalone: true,
    imports: [TooltipModule],
    templateUrl: './lateral-trilho.component.html',
    styleUrl: './lateral-trilho.component.scss',
})
export class LateralTrilhoComponent {
    readonly quantidade = input.required<number>();
    readonly abrir = output<void>();

    readonly rotulo = computed(() => (this.quantidade() > 0 ? `Mostrar minhas demandas (${this.quantidade()} em aberto)` : 'Mostrar minhas demandas'));
}
