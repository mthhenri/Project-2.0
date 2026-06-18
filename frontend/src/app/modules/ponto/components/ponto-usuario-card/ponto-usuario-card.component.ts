import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PontoDiarioDto } from '@project20/shared';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import { formatarSaldoMinutos } from '../../models/ponto.model';

@Component({
  selector: 'app-ponto-usuario-card',
  standalone: true,
  imports: [DatePipe, RouterModule, MinutosParaHorasPipe, ExecucaoTimerComponent],
  templateUrl: './ponto-usuario-card.component.html',
  styleUrl: './ponto-usuario-card.component.scss',
})
export class PontoUsuarioCardComponent {
  @Input({ required: true }) ponto!: PontoDiarioDto;

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }
}
