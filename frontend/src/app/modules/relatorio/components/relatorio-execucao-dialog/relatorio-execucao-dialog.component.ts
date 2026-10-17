import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, catchError, finalize, map, of, switchMap, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  RelatorioExecucaoDto,
  RelatorioInconsistenciaDto,
  RelatorioRevisaoDto,
  RelatorioPeriodoTipoEnum,
  RelatorioFormatoEnum,
  ProjetoResumoDto,
} from '@project20/shared';
import { RelatorioService, RelatorioParametros } from '../../services/relatorio.service';
import { ProjetoService } from '../../../projeto/services/projeto.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import {
  RelatorioPeriodoAtalho,
  atalhoDoPeriodo,
  normalizarSeveridade,
  ordemSeveridade,
  periodoDoAtalho,
} from '../../utils/relatorio.util';

const CHAVE_PROJETO_LEMBRADO = 'relatorio.projeto';
const ATRASO_MUDANCA_FILTRO_MS = 400;

/**
 * Relatório de execuções de um projeto (tasks 111/110). Abre já carregado: os padrões (Este mês) são
 * sempre válidos, então cada mudança de filtro recarrega sozinha; o resultado antigo fica esmaecido
 * enquanto o novo não chega e o CSV/IA só usam os parâmetros do que está na tela.
 */
@Component({
  selector: 'app-relatorio-execucao-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    SelectButtonModule,
    DatePipe,
    ButtonModule,
    Select,
    DatePickerModule,
    DialogModule,
    TableModule,
    Tag,
    TooltipModule,
    MinutosParaHorasPipe,
    BarraRecargaComponent,
  ],
  templateUrl: './relatorio-execucao-dialog.component.html',
  styleUrl: './relatorio-execucao-dialog.component.scss',
})
export class RelatorioExecucaoDialogComponent implements OnInit {
  private readonly relatorioService = inject(RelatorioService);
  private readonly projetoService = inject(ProjetoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly mostrarDialog = signal<boolean>(false);
  readonly projetos = signal<ProjetoResumoDto[]>([]);
  /** Aberto a partir do detalhe de um projeto: o projeto vem definido e não se troca. */
  readonly projetoFixo = signal<boolean>(false);

  readonly carregandoPreview = signal<boolean>(false);
  readonly carregandoRevisao = signal<boolean>(false);
  readonly baixando = signal<boolean>(false);
  readonly erroPreview = signal<boolean>(false);

  readonly relatorio = signal<RelatorioExecucaoDto | null>(null);
  readonly revisao = signal<RelatorioRevisaoDto | null>(null);
  /** Parâmetros do relatório que está na tela — o que o CSV e a IA realmente usam. */
  private readonly parametrosExibidos = signal<RelatorioParametros | null>(null);
  /** `false` entre a mudança de um filtro e a chegada do novo resultado. */
  readonly sincronizado = signal<boolean>(false);
  readonly esmaecido = computed(() => this.carregandoPreview() || (!this.sincronizado() && !!this.relatorio()));
  readonly podeExportar = computed(
    () => this.sincronizado() && !!this.relatorio() && (this.relatorio()?.totalExecucoes ?? 0) > 0,
  );

  private readonly pedidoPreview = new Subject<number>();

  readonly TipoPeriodo = RelatorioPeriodoTipoEnum;
  private readonly anoAtual = new Date().getFullYear();

  readonly formulario = this.formBuilder.group(
    {
      projetoId:   [null as number | null, [Validators.required]],
      periodoTipo: [RelatorioPeriodoTipoEnum.MENSAL as RelatorioPeriodoTipoEnum, [Validators.required]],
      ano:         [this.anoAtual as number, [Validators.required]],
      mes:         [new Date().getMonth() + 1 as number, [Validators.required]],
      periodo:     [null as Date[] | null],
    },
    { validators: this.validarPeriodo },
  );

  readonly atalhos: { valor: RelatorioPeriodoAtalho; rotulo: string }[] = [
    { valor: 'MES',     rotulo: 'Este mês' },
    { valor: 'PASSADO', rotulo: 'Mês passado' },
    { valor: 'ANO',     rotulo: 'Este ano' },
    { valor: 'CUSTOM',  rotulo: 'Personalizado…' },
  ];

  readonly anoOpcoes = Array.from({ length: 6 }, (_, indice) => {
    const ano = this.anoAtual - 5 + indice;
    return { label: String(ano), value: ano };
  });

  readonly mesOpcoes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ].map((label, indice) => ({ label, value: indice + 1 }));

  /** Achados ordenados ALTA → MÉDIA → BAIXA. */
  readonly achados = computed<RelatorioInconsistenciaDto[]>(() =>
    [...(this.revisao()?.inconsistencias ?? [])].sort((a, b) => ordemSeveridade(a.severidade) - ordemSeveridade(b.severidade)),
  );
  readonly contadores = computed(() =>
    (['ALTA', 'MEDIA', 'BAIXA'] as const)
      .map((severidade) => ({
        severidade,
        rotulo: severidade === 'MEDIA' ? 'MÉDIA' : severidade,
        total: this.achados().filter((item) => normalizarSeveridade(item.severidade) === severidade).length,
      }))
      .filter((contador) => contador.total > 0),
  );

  ngOnInit(): void {
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sincronizado.set(false);
      this.revisao.set(null);
      this.pedidoPreview.next(ATRASO_MUDANCA_FILTRO_MS);
    });

    this.pedidoPreview
      .pipe(
        switchMap((atraso) => timer(atraso)),
        switchMap(() => this.buscarPreview()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Abre já carregando: `projetoId` do detalhe do projeto, ou o último projeto escolhido nesta máquina. */
  abrir(projetoId?: number): void {
    this.projetoFixo.set(projetoId !== undefined);
    const atalho = periodoDoAtalho('MES');
    this.relatorio.set(null);
    this.revisao.set(null);
    this.erroPreview.set(false);
    this.sincronizado.set(false);
    this.formulario.controls.projetoId[projetoId !== undefined ? 'disable' : 'enable']({ emitEvent: false });
    this.formulario.reset({
      projetoId: projetoId ?? this.projetoLembrado(),
      periodoTipo: atalho.periodoTipo,
      ano: atalho.ano,
      mes: atalho.mes,
      periodo: null,
    }, { emitEvent: false });
    this.mostrarDialog.set(true);
    this.carregarProjetos();
    this.pedidoPreview.next(0);
  }

  escolherAtalho(atalho: RelatorioPeriodoAtalho): void {
    const periodo = periodoDoAtalho(atalho);
    this.formulario.patchValue({ periodoTipo: periodo.periodoTipo, ano: periodo.ano, mes: periodo.mes });
  }

  atalhoAtivo(): RelatorioPeriodoAtalho | null {
    const { periodoTipo, ano, mes } = this.formulario.getRawValue();
    return atalhoDoPeriodo({ periodoTipo: periodoTipo!, ano: ano!, mes: mes! });
  }

  get periodoIncompleto(): boolean {
    return this.formulario.hasError('periodoIncompleto');
  }

  tentarNovamente(): void {
    this.pedidoPreview.next(0);
  }

  baixarCsv(): void {
    const params = this.parametrosExibidos();
    if (!params || !this.podeExportar()) return;

    this.baixando.set(true);
    this.relatorioService
      .baixarRelatorio(params, RelatorioFormatoEnum.CSV)
      .pipe(finalize(() => this.baixando.set(false)))
      .subscribe({
        next: (resposta) => this.dispararDownload(resposta),
        error: () => undefined, // o interceptor já avisou o motivo
      });
  }

  revisarComIa(): void {
    const params = this.parametrosExibidos();
    if (!params || !this.podeExportar()) return;

    this.carregandoRevisao.set(true);
    this.relatorioService
      .revisarRelatorio(params)
      .pipe(finalize(() => this.carregandoRevisao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.revisao.set(resposta.dados);
        },
        error: () => undefined, // o interceptor já avisou o motivo
      });
  }

  severidadeInconsistencia(severidade: string): 'danger' | 'warn' | 'secondary' {
    const normalizada = normalizarSeveridade(severidade);
    if (normalizada === 'ALTA') return 'danger';
    if (normalizada === 'MEDIA') return 'warn';
    return 'secondary';
  }

  private buscarPreview() {
    const params = this.montarParametros();
    if (!params) {
      this.carregandoPreview.set(false);
      return of(null);
    }
    this.lembrarProjeto(params.projetoId);
    this.carregandoPreview.set(true);
    this.erroPreview.set(false);
    return this.relatorioService.gerarRelatorio(params).pipe(
      map((resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.relatorio.set(resposta.dados);
          this.parametrosExibidos.set(params);
          this.sincronizado.set(true);
        }
        return null;
      }),
      catchError(() => {
        this.erroPreview.set(true);
        return of(null);
      }),
      finalize(() => this.carregandoPreview.set(false)),
    );
  }

  /** Parâmetros dos filtros atuais, ou `null` enquanto faltar projeto ou o intervalo personalizado. */
  private montarParametros(): RelatorioParametros | null {
    if (this.formulario.invalid) return null;

    const valor = this.formulario.getRawValue();
    const periodoTipo = valor.periodoTipo!;
    const params: RelatorioParametros = { projetoId: valor.projetoId!, periodoTipo };

    if (periodoTipo === RelatorioPeriodoTipoEnum.ANUAL) {
      params.ano = valor.ano ?? undefined;
    } else if (periodoTipo === RelatorioPeriodoTipoEnum.MENSAL) {
      params.ano = valor.ano ?? undefined;
      params.mes = valor.mes ?? undefined;
    } else {
      const periodo = valor.periodo as Date[] | null;
      params.dataInicio = periodo?.[0] ? this.formatarData(periodo[0]) : undefined;
      params.dataFim = periodo?.[1] ? this.formatarData(periodo[1]) : undefined;
    }

    return params;
  }

  private carregarProjetos(): void {
    if (this.projetos().length > 0) return;
    this.projetoService.listar({ allRows: true }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.projetos.set(resposta.dados.itens);
      },
    });
  }

  private projetoLembrado(): number | null {
    try {
      const salvo = Number(localStorage.getItem(CHAVE_PROJETO_LEMBRADO));
      return salvo > 0 ? salvo : null;
    } catch {
      return null;
    }
  }

  private lembrarProjeto(projetoId: number): void {
    if (this.projetoFixo()) return;
    try {
      localStorage.setItem(CHAVE_PROJETO_LEMBRADO, String(projetoId));
    } catch {
      /* armazenamento indisponível: só não lembra */
    }
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
