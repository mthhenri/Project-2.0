import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
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
    TimelineModule,
    TooltipModule,
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
  @Output() atividadeSelecionada = new EventEmitter<number>();

  private readonly pontoService = inject(PontoService);
  readonly intervaloMinimoMinutos = ambiente.intervaloMinimoMinutos;

  readonly expandido = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  readonly detalhe = signal<PontoDiarioDto | null>(null);

  /** Há registro de trabalho no dia (logo, é expansível para ver a timeline). */
  get temRegistro(): boolean {
    return this.dia.totalMinutosTrabalhados > 0 || this.dia.primeiroInicioData !== null;
  }

  /** O dia exibido é o dia de hoje (compara o calendário local com a data ISO do dia). */
  get ehHoje(): boolean {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return this.dia.data.slice(0, 10) === `${ano}-${mes}-${dia}`;
  }

  /** Horas cobertas pela justificativa do dia, formatadas de forma compacta (ex.: "3h", "3h 30min"). */
  get justificativaCobertura(): string {
    const minutos = this.dia.justificativaMinutosCobertos;
    if (minutos === null) return '';
    if (minutos === 0) return '0h';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) return `${resto}min`;
    return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
  }

  /** Texto do tooltip do badge de justificativa (título + horas descontadas da meta). */
  get justificativaTooltip(): string {
    return `${this.dia.justificativaNome} · ${this.justificativaCobertura} descontadas da meta do dia`;
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
