import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaAlterarDto, hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { DemandaService } from '../../services/demanda.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { HORAS_POR_DIA } from '../../../../core/models/visualizacao-tempo.model';
import { dataDoAtalho, formatarDataIso, lerDataIso, AtalhoPrevisao } from '../../utils/demanda-datas.util';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';

type CampoMetrica = 'horasEstimadas' | 'previsaoFimData';

/**
 * Métricas do detalhe (task 108): "Estimado" e "Previsão de término" com click-to-edit (gestor). Enter/seleção
 * grava na hora, Esc cancela; a previsão tem atalhos "+1 sem", "+2 sem" e "Fim do mês". Quem hospeda recebe a
 * alteração já aplicada (otimista, com rollback se a API recusar).
 */
@Component({
  selector: 'app-demanda-metricas',
  standalone: true,
  imports: [FormsModule, ButtonModule, DatePickerModule, InputNumberModule, TooltipModule, DataBrasileiraPipe, TempoExibicaoPipe],
  templateUrl: './demanda-metricas.component.html',
  styleUrl: './demanda-metricas.component.scss',
})
export class DemandaMetricasComponent {
  private readonly demandaService = inject(DemandaService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly demandaId = input.required<number>();
  readonly horasEstimadas = input.required<number>();
  readonly previsaoFimData = input<string | null>(null);
  readonly editavel = input<boolean>(false);
  /** Valor já aplicado pela tela; `anterior` serve ao rollback de quem hospeda. */
  readonly alterada = output<Partial<Pick<DemandaAlterarDto, 'horasEstimadas' | 'previsaoFimData'>> & { reverter?: boolean }>();

  readonly campoEditando = signal<CampoMetrica | null>(null);
  valorHoras = 0;
  valorData: Date | null = null;

  readonly sufixoHoras = computed(() => (this.unidadeTempo.emDias() ? ' dia(s)' : ' h'));

  editar(campo: CampoMetrica): void {
    if (!this.editavel()) return;
    if (campo === 'horasEstimadas') {
      this.valorHoras = this.unidadeTempo.emDias() ? this.horasEstimadas() / HORAS_POR_DIA : this.horasEstimadas();
    } else {
      const atual = this.previsaoFimData();
      this.valorData = atual ? lerDataIso(atual) : null;
    }
    this.campoEditando.set(campo);
  }

  cancelar(): void {
    this.campoEditando.set(null);
  }

  salvarHoras(): void {
    if (this.campoEditando() !== 'horasEstimadas') return;
    const valor = this.valorHoras ?? 0;
    const horas = this.unidadeTempo.emDias() ? Math.round(valor * HORAS_POR_DIA) : valor;
    this.campoEditando.set(null);
    if (horas === this.horasEstimadas() || horas < 0) return;
    this.gravar({ horasEstimadas: horas }, { horasEstimadas: this.horasEstimadas() });
  }

  salvarData(data: Date | null): void {
    this.campoEditando.set(null);
    if (!data) return;
    const iso = formatarDataIso(data);
    if (iso === this.previsaoFimData()) return;
    this.gravar({ previsaoFimData: iso }, { previsaoFimData: this.previsaoFimData() ?? undefined });
  }

  /** Atalhos a partir de hoje: +1 semana, +2 semanas e o último dia do mês. */
  atalho(tipo: AtalhoPrevisao): void {
    this.salvarData(dataDoAtalho(tipo, hojeNoFuso(ambiente.fusoHorario)));
  }

  aoTeclarHoras(evento: KeyboardEvent): void {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      this.salvarHoras();
    } else if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.cancelar();
    }
  }

  private gravar(novo: DemandaAlterarDto, anterior: DemandaAlterarDto): void {
    this.alterada.emit(novo);
    this.demandaService.alterar(this.demandaId(), novo).subscribe({
      error: () => this.alterada.emit({ ...anterior, reverter: true }),
    });
  }
}
