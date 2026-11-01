import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Esqueleto da Árvore de demandas (task 300): as três colunas da tela real (pastas, lista e demanda aberta, na
 * mesma proporção 20/28/52) e a faixa da barra de filtros, que só aparece depois da carga, para a tela não saltar.
 */
@Component({
    selector: 'app-demanda-arvore-esqueleto',
    standalone: true,
    imports: [SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './demanda-arvore-esqueleto.component.html',
    styleUrl: './demanda-arvore-esqueleto.component.scss',
})
export class DemandaArvoreEsqueletoComponent {
    /** A faixa da barra de filtros; fica de fora onde a barra é um bloco à parte (detalhe do projeto). */
    @Input() comBarra = true;

    readonly pastas = [0, 1, 2, 3];
    readonly demandas = [0, 1, 2, 3, 4, 5, 6, 7, 8];
}
