import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Barra fina indeterminada no topo do contêiner (`position: relative`) enquanto uma recarga
 * acontece com o conteúdo anterior ainda visível, esmaecido (classe global `conteudo-recarregando`).
 */
@Component({
    selector: 'app-barra-recarga',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './barra-recarga.component.html',
    styleUrl: './barra-recarga.component.scss',
})
export class BarraRecargaComponent {
    @Input() ativa = false;
}
