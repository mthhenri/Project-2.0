import { Component, Input, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TimelineModule } from 'primeng/timeline';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { PontoDiaResumoDto, PontoDiarioDto } from '@project20/shared';
import { PontoService } from '../../services/ponto.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import { PontoIntervaloListaComponent } from '../ponto-intervalo-lista/ponto-intervalo-lista.component';
import {
  formatarSaldoMinutos,
  abreviacaoDiaSemana,
  numeroDoDia,
} from '../../models/ponto.model';
import { ambiente } from '../../../../../environments/environment';

@Component({
  selector: 'app-ponto-mes-dia',
  standalone: true,
  imports: [
    DatePipe,
    RouterModule,
    TimelineModule,
    ProgressSpinnerModule,
    MinutosParaHorasPipe,
    ExecucaoTimerComponent,
    PontoIntervaloListaComponent,
  ],
  templateUrl: './ponto-mes-dia.component.html',
  styleUrl: './ponto-mes-dia.component.scss',
})
export class PontoMesDiaComponent {
  @Input({ required: true }) dia!: PontoDiaResumoDto;
  @Input({ required: true }) usuarioId!: number;

  private readonly pontoService = inject(PontoService);
  readonly intervaloMinimoMinutos = ambiente.intervaloMinimoMinutos;

  readonly expandido = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  readonly detalhe = signal<PontoDiarioDto | null>(null);

  /** Há registro de trabalho no dia (logo, é expansível para ver a timeline). */
  get temRegistro(): boolean {
    return this.dia.totalMinutosTrabalhados > 0 || this.dia.primeiroInicioData !== null;
  }

  abreviacao(): string {
    return abreviacaoDiaSemana(this.dia.data);
  }

  numero(): number {
    return numeroDoDia(this.dia.data);
  }

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }

  alternar(): void {
    if (!this.temRegistro) return;
    const proximo = !this.expandido();
    this.expandido.set(proximo);
    if (proximo && !this.detalhe()) {
      this.carregarDetalhe();
    }
  }

  private carregarDetalhe(): void {
    this.carregando.set(true);
    this.pontoService
      .consultarDiario({ data: this.dia.data, usuarioId: this.usuarioId })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.detalhe.set(resposta.dados);
        },
      });
  }
}
