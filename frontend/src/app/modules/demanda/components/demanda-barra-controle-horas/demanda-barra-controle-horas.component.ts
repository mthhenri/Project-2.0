import { Component, computed, inject, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { calcularBarraHoras } from '../../utils/demanda-horas.util';

/**
 * A barra do Controle de horas (task 240): vai até 150% do estimado, com um risco nos 100%, e muda de cor conforme o executado se aproxima e
 * passa do estimado (regra em `calcularBarraHoras`). Ao lado, o executado e o saldo: "faltam 2h" ou "+3h (150%)". É outra da barra curta da
 * Árvore (`app-demanda-barra-horas`, que trava em 100%): aquela cabe na linha da lista, esta conta o estouro.
 */
@Component({
  selector: 'app-demanda-barra-controle-horas',
  standalone: true,
  imports: [TooltipModule, TempoExibicaoPipe],
  templateUrl: './demanda-barra-controle-horas.component.html',
  styleUrl: './demanda-barra-controle-horas.component.scss',
})
export class DemandaBarraControleHorasComponent {
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly minutosExecutados = input.required<number>();
  readonly horasEstimadas = input.required<number>();

  readonly barra = computed(() => calcularBarraHoras(this.minutosExecutados(), this.horasEstimadas()));
  readonly temEstimativa = computed(() => this.horasEstimadas() > 0);
}
