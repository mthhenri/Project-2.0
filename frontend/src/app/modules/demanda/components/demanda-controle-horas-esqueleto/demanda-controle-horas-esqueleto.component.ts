import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Esqueleto do Controle de horas (task 300): os quatro números do resumo, a barra de ação, a tabela em árvore
 * (cabeçalho de 35 px e linhas de 40 px) e os dois cartões de baixo, nas medidas da tela real.
 */
@Component({
    selector: 'app-demanda-controle-horas-esqueleto',
    standalone: true,
    imports: [SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './demanda-controle-horas-esqueleto.component.html',
    styleUrl: './demanda-controle-horas-esqueleto.component.scss',
})
export class DemandaControleHorasEsqueletoComponent {
    readonly numeros = [0, 1, 2, 3];
    readonly linhas = [0, 1, 2, 3, 4, 5, 6];
    readonly cartoes = [0, 1];
}
