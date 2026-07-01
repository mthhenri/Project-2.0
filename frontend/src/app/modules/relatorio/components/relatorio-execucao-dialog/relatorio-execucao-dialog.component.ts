import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  RelatorioExecucaoDto,
  RelatorioRevisaoDto,
  RelatorioPeriodoTipoEnum,
  RelatorioFormatoEnum,
} from '@project20/shared';
import { RelatorioService, RelatorioParametros } from '../../services/relatorio.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';

@Component({
  selector: 'app-relatorio-execucao-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ButtonModule,
    Select,
    DatePickerModule,
    DialogModule,
    TableModule,
    Tag,
    TooltipModule,
    MinutosParaHorasPipe,
  ],
  templateUrl: './relatorio-execucao-dialog.component.html',
  styleUrl: './relatorio-execucao-dialog.component.scss',
})
export class RelatorioExecucaoDialogComponent {
  private readonly relatorioService = inject(RelatorioService);
  private readonly formBuilder = inject(FormBuilder);

  /** Exposto ao template para os `@if` de campos condicionais por tipo de período. */
  readonly TipoPeriodo = RelatorioPeriodoTipoEnum;

  readonly mostrarDialog = signal<boolean>(false);
  readonly projetoId = signal<number | null>(null);

  readonly carregandoPreview = signal<boolean>(false);
  readonly carregandoRevisao = signal<boolean>(false);
  readonly baixando = signal<boolean>(false);

  readonly relatorio = signal<RelatorioExecucaoDto | null>(null);
  readonly revisao = signal<RelatorioRevisaoDto | null>(null);

  private readonly anoAtual = new Date().getFullYear();
  private readonly mesAtual = new Date().getMonth() + 1;

  readonly formulario = this.formBuilder.group(
    {
      periodoTipo: [RelatorioPeriodoTipoEnum.MENSAL as RelatorioPeriodoTipoEnum, [Validators.required]],
      ano:         [this.anoAtual as number, [Validators.required]],
      mes:         [this.mesAtual as number, [Validators.required]],
      periodo:     [null as Date[] | null],
    },
    { validators: this.validarPeriodo },
  );

  readonly periodoOpcoes = [
    { label: 'Anual',         value: RelatorioPeriodoTipoEnum.ANUAL },
    { label: 'Mensal',        value: RelatorioPeriodoTipoEnum.MENSAL },
    { label: 'Personalizado', value: RelatorioPeriodoTipoEnum.CUSTOM },
  ];

  readonly anoOpcoes = Array.from({ length: 6 }, (_, indice) => {
    const ano = this.anoAtual - 5 + indice;
    return { label: String(ano), value: ano };
  });

  readonly mesOpcoes = [
    { label: 'Janeiro',   value: 1 },
    { label: 'Fevereiro', value: 2 },
    { label: 'Março',     value: 3 },
    { label: 'Abril',     value: 4 },
    { label: 'Maio',      value: 5 },
    { label: 'Junho',     value: 6 },
    { label: 'Julho',     value: 7 },
    { label: 'Agosto',    value: 8 },
    { label: 'Setembro',  value: 9 },
    { label: 'Outubro',   value: 10 },
    { label: 'Novembro',  value: 11 },
    { label: 'Dezembro',  value: 12 },
  ];

  /** Abre o dialog para um projeto, com o formulário no padrão mensal do mês corrente. */
  abrir(projetoId: number): void {
    this.projetoId.set(projetoId);
    this.formulario.reset({
      periodoTipo: RelatorioPeriodoTipoEnum.MENSAL,
      ano:         this.anoAtual,
      mes:         this.mesAtual,
      periodo:     null,
    });
    this.relatorio.set(null);
    this.revisao.set(null);
    this.mostrarDialog.set(true);
  }

  preVisualizar(): void {
    const params = this.montarParametros();
    if (!params) return;

    this.carregandoPreview.set(true);
    this.revisao.set(null);
    this.relatorioService
      .gerarRelatorio(params)
      .pipe(finalize(() => this.carregandoPreview.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.relatorio.set(resposta.dados);
        },
      });
  }

  baixarCsv(): void {
    const params = this.montarParametros();
    if (!params) return;

    this.baixando.set(true);
    this.relatorioService
      .baixarRelatorio(params, RelatorioFormatoEnum.CSV)
      .pipe(finalize(() => this.baixando.set(false)))
      .subscribe({
        next: (resposta) => this.dispararDownload(resposta),
      });
  }

  revisarComIa(): void {
    const params = this.montarParametros();
    if (!params) return;

    this.carregandoRevisao.set(true);
    this.relatorioService
      .revisarRelatorio(params)
      .pipe(finalize(() => this.carregandoRevisao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.revisao.set(resposta.dados);
        },
      });
  }

  campoObrigatorioInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  get periodoIncompleto(): boolean {
    return !!(this.formulario.hasError('periodoIncompleto') && this.formulario.get('periodo')?.touched);
  }

  severidadeInconsistencia(severidade: string): 'danger' | 'warn' | 'secondary' {
    const normalizada = (severidade ?? '').toUpperCase();
    if (normalizada === 'ALTA') return 'danger';
    if (normalizada === 'MEDIA') return 'warn';
    return 'secondary';
  }

  private montarParametros(): RelatorioParametros | null {
    const projetoId = this.projetoId();
    if (projetoId === null || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return null;
    }

    const valor = this.formulario.value;
    const periodoTipo = valor.periodoTipo!;
    const params: RelatorioParametros = { projetoId, periodoTipo };

    if (periodoTipo === RelatorioPeriodoTipoEnum.ANUAL) {
      params.ano = valor.ano ?? undefined;
    } else if (periodoTipo === RelatorioPeriodoTipoEnum.MENSAL) {
      params.ano = valor.ano ?? undefined;
      params.mes = valor.mes ?? undefined;
    } else {
      const periodo = this.formulario.controls.periodo.value as Date[] | null;
      params.dataInicio = periodo?.[0] ? this.formatarData(periodo[0]) : undefined;
      params.dataFim = periodo?.[1] ? this.formatarData(periodo[1]) : undefined;
    }

    return params;
  }

  private dispararDownload(resposta: HttpResponse<Blob>): void {
    const blob = resposta.body;
    if (!blob) return;

    const nomeArquivo = this.extrairNomeArquivo(resposta) ?? 'relatorio-execucoes.csv';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  private extrairNomeArquivo(resposta: HttpResponse<Blob>): string | null {
    const cabecalho = resposta.headers.get('Content-Disposition');
    if (!cabecalho) return null;
    const correspondencia = /filename="?([^"]+)"?/.exec(cabecalho);
    return correspondencia ? correspondencia[1] : null;
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private validarPeriodo(controle: AbstractControl): ValidationErrors | null {
    const periodoTipo = controle.get('periodoTipo')?.value as RelatorioPeriodoTipoEnum;
    if (periodoTipo !== RelatorioPeriodoTipoEnum.CUSTOM) return null;

    const periodo = controle.get('periodo')?.value as Date[] | null;
    if (!periodo || !periodo[0] || !periodo[1]) return { periodoIncompleto: true };
    return null;
  }
}
