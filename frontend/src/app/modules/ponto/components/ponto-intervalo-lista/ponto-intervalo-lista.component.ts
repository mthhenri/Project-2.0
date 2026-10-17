import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IntervaloDto } from '@project20/shared';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';

@Component({
  selector: 'app-ponto-intervalo-lista',
  standalone: true,
  imports: [DatePipe, MinutosParaHorasPipe],
  template: `
    <div class="flex flex-col gap-3 rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 p-4">
      <h2 class="text-sm font-semibold text-color">
        Intervalos detectados (≥ {{ minutoMinimo }} min)
      </h2>

      @if (intervalos.length) {
        <ul class="flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
          @for (intervalo of intervalos; track $index) {
            <li class="flex items-center justify-between gap-4 py-2">
              <span class="flex items-center gap-2 text-sm text-color">
                <i class="pi pi-pause-circle text-muted-color"></i>
                {{ intervalo.inicioData | date: 'HH:mm' }}
                <i class="pi pi-arrow-right text-xs text-muted-color"></i>
                {{ intervalo.fimData | date: 'HH:mm' }}
              </span>
              <span class="text-sm font-medium text-muted-color">
                {{ intervalo.duracaoMinutos | minutosParagHoras }}
              </span>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-muted-color">Nenhum intervalo detectado no dia.</p>
      }
    </div>
  `,
})
export class PontoIntervaloListaComponent {
  @Input({ required: true }) intervalos: IntervaloDto[] = [];
  @Input({ required: true }) minutoMinimo!: number;
}
