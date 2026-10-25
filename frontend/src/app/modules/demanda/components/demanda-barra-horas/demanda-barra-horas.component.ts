import { Component, computed, inject, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';

/**
 * A barra de horas da demanda (task 239): executado sobre o estimado, com o texto "2h de 6h". Trava em 100% e fica vermelha ao estourar; sem
 * estimativa, mostra só o que foi executado. É a mesma na linha da lista e na demanda aberta (o Controle de horas tem a sua, task 240).
 */
@Component({
  selector: 'app-demanda-barra-horas',
  standalone: true,
  imports: [TooltipModule, TempoExibicaoPipe],
  templateUrl: './demanda-barra-horas.component.html',
  styleUrl: './demanda-barra-horas.component.scss',
})
export class DemandaBarraHorasComponent {
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly minutosExecutados = input.required<number>();
  readonly horasEstimadas = input.required<number>();
  /** Barra larga, para a demanda aberta; a da linha é curta. */
  readonly larga = input<boolean>(false);

  readonly temEstimativa = computed(() => this.horasEstimadas() > 0);
  readonly percentual = computed(() => {
    const minutosEstimados = this.horasEstimadas() * 60;
    return minutosEstimados > 0 ? Math.min(100, Math.round((this.minutosExecutados() / minutosEstimados) * 100)) : 0;
  });
  readonly estourou = computed(() => this.temEstimativa() && this.minutosExecutados() >= this.horasEstimadas() * 60);
}
