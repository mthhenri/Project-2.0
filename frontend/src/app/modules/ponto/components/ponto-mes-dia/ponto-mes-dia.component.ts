import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { ExecucaoItemDto, PontoDiaResumoDto, PontoDiarioDto, dataIsoNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { PontoService } from '../../services/ponto.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import {
  AlertaDoDia,
  FaixaIntervalo,
  SegmentoDoDia,
  alertasDoDia,
  descricaoDaFaixa,
  formatarSaldoMinutos,
  abreviacaoDiaSemana,
  montarSegmentosDoDia,
  numeroDoDia,
} from '../../models/ponto.model';

/** Bloco do detalhe do dia: um período com as suas execuções ou o intervalo entre dois períodos. */
type BlocoDoDetalhe =
  | { tipo: 'PERIODO'; segmento: SegmentoDoDia; execucoes: ExecucaoItemDto[]; totalMinutos: number }
  | { tipo: 'INTERVALO'; segmento: SegmentoDoDia };

@Component({
  selector: 'app-ponto-mes-dia',
  standalone: true,
  imports: [
    DatePipe,
    TooltipModule,
    ProgressSpinnerModule,
    MinutosParaHorasPipe,
    ExecucaoTimerComponent,
  ],
  templateUrl: './ponto-mes-dia.component.html',
  styleUrl: './ponto-mes-dia.component.scss',
})
export class PontoMesDiaComponent {
  @Input({ required: true }) dia!: PontoDiaResumoDto;
  @Input({ required: true }) usuarioId!: number;
  /** Gestor vê o botão "Justificar" na linha e o badge de justificativa clicável. */
  @Input() podeJustificar = false;
  @Output() atividadeSelecionada = new EventEmitter<number>();
  /** Pede ao pai para abrir o dialog de justificativa naquele dia (a linha não expande). */
  @Output() justificarSolicitada = new EventEmitter<PontoDiaResumoDto>();

  private readonly pontoService = inject(PontoService);

  readonly expandido = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  readonly detalhe = signal<PontoDiarioDto | null>(null);

  private resumoMemorizado?: { dia: PontoDiaResumoDto; segmentos: SegmentoDoDia[]; alertas: AlertaDoDia[] };

  /** Períodos e intervalos do dia em ordem, para a linha (calculados uma vez por `dia`). */
  get segmentos(): SegmentoDoDia[] {
    return this.resumo().segmentos;
  }

  /** Alertas da linha: hora a menos sem justificativa e excesso sobre o limite diário. */
  get alertas(): AlertaDoDia[] {
    return this.resumo().alertas;
  }

  private resumo() {
    if (this.resumoMemorizado?.dia !== this.dia) {
      this.resumoMemorizado = { dia: this.dia, segmentos: montarSegmentosDoDia(this.dia, ambiente.fusoHorario), alertas: alertasDoDia(this.dia, this.hojeIso()) };
    }
    return this.resumoMemorizado;
  }

  /** O detalhe em blocos: cada período com as execuções que começaram nele, e os intervalos entre eles. */
  readonly blocosDoDetalhe = computed<BlocoDoDetalhe[]>(() => {
    const detalheDia = this.detalhe();
    if (!detalheDia) return [];
    const execucoes = [...detalheDia.execucoes].sort((a, b) => new Date(a.inicioData).getTime() - new Date(b.inicioData).getTime());
    const periodos = this.segmentos.filter((segmento) => segmento.tipo === 'PERIODO');
    return this.segmentos.map((segmento): BlocoDoDetalhe => {
      if (segmento.tipo === 'INTERVALO') return { tipo: 'INTERVALO', segmento };
      const indice = periodos.indexOf(segmento);
      const inicio = segmento.inicioData.getTime();
      const fim = segmento.fimData ? segmento.fimData.getTime() : Infinity;
      const doPeriodo = execucoes.filter((execucao) => {
        const inicioExecucao = new Date(execucao.inicioData).getTime();
        // O que sobra fora de qualquer período (não deveria) vai para o último, em vez de sumir.
        return (inicioExecucao >= inicio && inicioExecucao <= fim) || (indice === periodos.length - 1 && inicioExecucao > fim);
      });
      return { tipo: 'PERIODO', segmento, execucoes: doPeriodo, totalMinutos: doPeriodo.reduce((soma, execucao) => soma + (execucao.duracaoMinutos ?? 0), 0) };
    });
  });

  classeDaFaixa(faixa: FaixaIntervalo | null): string {
    return faixa ? `ponto-mes-dia__faixa--${faixa.toLowerCase()}` : '';
  }

  descricaoDoIntervalo(segmento: SegmentoDoDia): string {
    return segmento.faixa ? descricaoDaFaixa(segmento.faixa) : '';
  }

  /** Há registro de trabalho no dia (logo, é expansível para ver a timeline). */
  get temRegistro(): boolean {
    return this.dia.totalMinutosTrabalhados > 0 || this.dia.primeiroInicioData !== null;
  }

  /** O dia exibido é o dia de hoje no fuso do sistema (compara com a data ISO do dia). */
  get ehHoje(): boolean {
    return this.dia.data.slice(0, 10) === this.hojeIso();
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

  /** Dia útil já encerrado ou em curso, com déficit e sem justificativa: oferece "Justificar" inline. */
  get oferecerJustificar(): boolean {
    return (
      this.podeJustificar &&
      this.dia.ehDiaUtil &&
      this.dia.saldoMinutos < 0 &&
      !this.dia.justificativaNome &&
      this.dia.data.slice(0, 10) <= this.hojeIso()
    );
  }

  justificar(evento: Event): void {
    evento.stopPropagation();
    this.justificarSolicitada.emit(this.dia);
  }

  /** Tooltip do saldo: a meta efetiva do dia (já descontada a justificativa). */
  get metaTooltip(): string {
    const horas = Math.floor(this.dia.metaMinutos / 60);
    const minutos = this.dia.metaMinutos % 60;
    return `Meta do dia: ${horas}h ${minutos}min`;
  }

  private hojeIso(): string {
    return dataIsoNoFuso(new Date(), ambiente.fusoHorario);
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
