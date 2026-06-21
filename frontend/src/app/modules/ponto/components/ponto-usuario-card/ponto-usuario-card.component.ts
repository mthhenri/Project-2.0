import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PontoDiarioDto } from '@project20/shared';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import { formatarSaldoMinutos } from '../../models/ponto.model';

@Component({
  selector: 'app-ponto-usuario-card',
  standalone: true,
  imports: [DatePipe, MinutosParaHorasPipe, ExecucaoTimerComponent],
  templateUrl: './ponto-usuario-card.component.html',
  styleUrl: './ponto-usuario-card.component.scss',
})
export class PontoUsuarioCardComponent {
  @Input({ required: true }) ponto!: PontoDiarioDto;
  @Output() atividadeSelecionada = new EventEmitter<number>();

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }
}
