import { Component, Input } from '@angular/core';

/** Variante visual do valor em destaque do card de resumo. */
export type PontoResumoCardCor = 'neutro' | 'positivo' | 'negativo' | 'primario';

@Component({
  selector: 'app-ponto-resumo-card',
  standalone: true,
  imports: [],
  templateUrl: './ponto-resumo-card.component.html',
})
export class PontoResumoCardComponent {
  @Input({ required: true }) rotulo!: string;
  @Input({ required: true }) valor!: string;
  @Input() icone = '';
  @Input() cor: PontoResumoCardCor = 'neutro';

  classeValor(): string {
    switch (this.cor) {
      case 'positivo':
        return 'text-green-600 dark:text-green-400';
      case 'negativo':
        return 'text-red-600 dark:text-red-400';
      case 'primario':
        return 'text-[var(--p-primary-color)]';
      default:
        return 'text-color';
    }
  }
}
