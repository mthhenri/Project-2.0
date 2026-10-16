import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Esqueleto da primeira carga (task 98): reserva o espaço do conteúdo real para a tela não
 * saltar quando os dados chegam. `tabela` = linhas com colunas; `cartoes` = grade de cartões;
 * `linhas` = lista simples (árvore, justificativas).
 */
@Component({
  selector: 'app-skeleton-lista',
  standalone: true,
  imports: [SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton-lista.component.html',
  styleUrl: './skeleton-lista.component.scss',
})
export class SkeletonListaComponent {
  @Input() variante: 'tabela' | 'cartoes' | 'linhas' = 'tabela';
  @Input() set quantidade(valor: number) { this.itens.set(Array.from({ length: Math.max(1, valor) }, (_, i) => i)); }
  @Input() set colunas(valor: number) { this.celulas.set(Array.from({ length: Math.max(1, valor) }, (_, i) => i)); }

  readonly itens = signal<number[]>(Array.from({ length: 6 }, (_, i) => i));
  readonly celulas = signal<number[]>(Array.from({ length: 5 }, (_, i) => i));
  readonly colunasCss = computed(() => `repeat(${this.celulas().length}, minmax(0, 1fr))`);
}
