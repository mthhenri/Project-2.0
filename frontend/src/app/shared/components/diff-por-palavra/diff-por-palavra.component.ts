import { Component, computed, input } from '@angular/core';
import { compararPorPalavra, diffTemMudanca, TrechoDiff, TrechoDiffTipoEnum } from '@project20/shared';

/**
 * Diff sobreposto por palavra (task 224): o texto uma vez só, com o que sai riscado em vermelho e o que entra em verde. Serve às
 * propostas da IA e ao plano do modo planejamento. `codigo` usa fonte monoespaçada e preserva a indentação e as quebras de linha;
 * texto longo rola dentro do próprio diff (`--diff-por-palavra-altura-maxima` ajusta o teto).
 */
@Component({
  selector: 'app-diff-por-palavra',
  standalone: true,
  templateUrl: './diff-por-palavra.component.html',
  styleUrl: './diff-por-palavra.component.scss',
})
export class DiffPorPalavraComponent {
  readonly antes = input<string | null | undefined>('');
  readonly depois = input<string | null | undefined>('');
  /** Texto de código: fonte monoespaçada, indentação e quebras de linha mantidas. */
  readonly codigo = input(false);
  /** Dentro de uma linha de texto (a proposta compacta): corre junto das palavras em volta, sem caixa nem rolagem própria. */
  readonly emLinha = input(false);

  readonly Tipo = TrechoDiffTipoEnum;
  readonly trechos = computed<TrechoDiff[]>(() => compararPorPalavra(this.antes() ?? '', this.depois() ?? ''));
  readonly semMudanca = computed(() => !diffTemMudanca(this.trechos()));
}
