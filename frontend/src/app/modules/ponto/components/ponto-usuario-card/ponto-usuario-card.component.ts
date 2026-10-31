import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PontoDiarioDto } from '@project20/shared';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import { formatarSaldoMinutos } from '../../models/ponto.model';
import { ambiente } from '../../../../../environments/environment';

@Component({
  selector: 'app-ponto-usuario-card',
  standalone: true,
  imports: [DatePipe, TooltipModule, MinutosParaHorasPipe, ExecucaoTimerComponent],
  templateUrl: './ponto-usuario-card.component.html',
  styleUrl: './ponto-usuario-card.component.scss',
})
export class PontoUsuarioCardComponent {
  @Input({ required: true }) ponto!: PontoDiarioDto;
  /** Nome/avatar clicável: abre o mensal da pessoa. */
  @Output() usuarioSelecionado = new EventEmitter<number>();

  readonly intervaloMinimoMinutos = ambiente.intervaloMinimoMinutos;

  /** Estado do dia: trabalhando (execução aberta), pausado (já registrou, nenhuma aberta) ou sem registros. */
  get estado(): 'trabalhando' | 'pausado' | 'sem-registros' {
    if (this.ponto.execucoes.some((execucao) => execucao.fimData === null)) return 'trabalhando';
    return this.ponto.execucoes.length ? 'pausado' : 'sem-registros';
  }

  get rotuloEstado(): string {
    return { trabalhando: 'Trabalhando agora', pausado: 'Pausado', 'sem-registros': 'Sem registros hoje' }[this.estado];
  }

  get iniciais(): string {
    return this.ponto.nomeUsuario.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }
}
