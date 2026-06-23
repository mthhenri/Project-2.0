import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  ExecucaoListarDto,
  ExecucaoResumoDto,
  ExecucaoAlterarDto,
  UsuarioResumoDto,
  UsuarioStatusEnum,
} from '@project20/shared';
import { ExecucaoService } from '../../services/execucao.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { AtividadeVisualizarDialogComponent } from '../../../atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component';

@Component({
  selector: 'app-execucao-historico',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DatePickerModule,
    Select,
    DialogModule,
    TextareaModule,
    TooltipModule,
    MinutosParaHorasPipe,
    AtividadeVisualizarDialogComponent,
  ],
  templateUrl: './execucao-historico.page.html',
  styleUrl: './execucao-historico.page.scss',
})
export class ExecucaoHistoricoPage implements OnInit {
  private readonly execucaoService = inject(ExecucaoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  readonly sessao = inject(UsuarioSessaoService);

  /** Data máxima navegável: hoje. Não é permitido visualizar dias futuros. */
  readonly hoje = this.inicioDoDia(new Date());
  private readonly hojeIso = this.formatarData(this.hoje);

  readonly formularioFiltros = this.formBuilder.group({
    data:      [this.hoje as Date],
    usuarioId: [null as number | null],
  });

  readonly execucoes = signal<ExecucaoResumoDto[]>([]);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly totalMinutosDia = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(50);

  /** Data atualmente em exibição (yyyy-mm-dd), espelhada para reatividade. */
  readonly dataSelecionada = signal<string>(this.hojeIso);
  readonly visualizandoHoje = computed(() => this.dataSelecionada() === this.hojeIso);

  // --- Dialog: editar execução (gestor) ---
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly salvandoDescricao = signal<boolean>(false);
  readonly execucaoEmEdicao = signal<ExecucaoResumoDto | null>(null);
  /** Limite máximo (momento atual) para os campos de data/hora da edição. */
  readonly dataMaximaEdicao = signal<Date>(new Date());
  readonly formularioEdicao = this.formBuilder.group({
    descricao:  ['', [Validators.required]],
    inicioData: [null as Date | null, [Validators.required]],
    fimData:    [null as Date | null],
  });

  /** Textarea de descrição; recebe o foco ao abrir o dialog, não o campo de início. */
  @ViewChild('descricaoEdicao') private descricaoEdicao?: ElementRef<HTMLTextAreaElement>;

  ngOnInit(): void {
    if (this.sessao.eGestor()) this.carregarUsuarios();
  }

  /**
   * Recarrega a listagem ao retornar à tela: `visibilitychange` cobre a troca de
   * aba/minimização; `window:focus` cobre o retorno de outro aplicativo (Alt-Tab),
   * cenário em que `visibilitychange` não dispara. A guarda `carregando` evita a
   * dupla requisição quando os dois eventos disparam juntos (minimizar/restaurar).
   */
  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  aoVoltarParaAba(): void {
    if (document.visibilityState !== 'visible' || this.carregando()) return;
    this.buscarExecucoes();
  }

  buscarExecucoes(): void {
    this.carregando.set(true);

    const filtros: ExecucaoListarDto = {
      pagina:         this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };

    const { data, usuarioId } = this.formularioFiltros.value;
    if (data instanceof Date) filtros.data = this.formatarData(data);
    if (this.sessao.eGestor() && usuarioId) filtros.usuarioId = usuarioId;

    this.execucaoService
      .listar(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.execucoes.set(resposta.dados.itens);
            this.totalRegistros.set(resposta.dados.totalItens);
            this.totalMinutosDia.set(resposta.dados.totalMinutosDia);
          }
        },
      });
  }

  aoCarregarTabela(evento: TableLazyLoadEvent): void {
    const primeira = evento.first ?? 0;
    const linhas = evento.rows ?? this.itensPorPagina();
    this.paginaAtual.set(Math.floor(primeira / linhas) + 1);
    this.itensPorPagina.set(linhas);
    this.buscarExecucoes();
  }

  aoMudarFiltro(): void {
    const data = this.formularioFiltros.value.data;
    this.dataSelecionada.set(data instanceof Date ? this.formatarData(data) : this.hojeIso);
    this.paginaAtual.set(1);
    this.buscarExecucoes();
  }

  voltarParaHoje(): void {
    if (this.visualizandoHoje()) return;
    this.formularioFiltros.patchValue({ data: this.hoje });
    this.aoMudarFiltro();
  }

  /** Avança um dia. Bloqueado quando já se está no dia de hoje (sem dias futuros). */
  avancarDia(): void {
    if (this.visualizandoHoje()) return;
    this.deslocarDia(1);
  }

  /** Retorna um dia. Sempre disponível — não há limite para o passado. */
  retornarDia(): void {
    this.deslocarDia(-1);
  }

  private deslocarDia(dias: number): void {
    const atual = this.formularioFiltros.value.data ?? this.hoje;
    const nova = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + dias);
    const limitada = nova > this.hoje ? this.hoje : nova;
    this.formularioFiltros.patchValue({ data: limitada });
    this.aoMudarFiltro();
  }

  // ---------------------------------------------------------------------------
  // Edição de descrição (apenas gestor)
  // ---------------------------------------------------------------------------

  abrirEdicao(execucao: ExecucaoResumoDto): void {
    if (!this.sessao.eGestor()) return;
    this.execucaoEmEdicao.set(execucao);
    this.dataMaximaEdicao.set(new Date());
    this.formularioEdicao.reset({
      descricao:  execucao.descricao,
      inicioData: new Date(execucao.inicioData),
      fimData:    execucao.fimData ? new Date(execucao.fimData) : null,
    });
    this.mostrarDialogEditar.set(true);
  }

  /** Foca a descrição ao abrir o dialog — em vez do primeiro campo (início). */
  focarDescricaoEdicao(): void {
    this.descricaoEdicao?.nativeElement.focus();
  }

  salvarEdicao(): void {
    const execucao = this.execucaoEmEdicao();
    if (!execucao) return;
    if (this.formularioEdicao.invalid) {
      this.formularioEdicao.markAllAsTouched();
      return;
    }

    const { descricao, inicioData, fimData } = this.formularioEdicao.value;
    if (fimData && inicioData && fimData <= inicioData) {
      this.messageService.add({
        severity: 'warn',
        summary:  'Período inválido',
        detail:   'A data de fim deve ser posterior à data de início',
      });
      return;
    }

    const dto: ExecucaoAlterarDto = {
      descricao:  descricao!.trim(),
      inicioData: inicioData!.toISOString(),
      fimData:    fimData ? fimData.toISOString() : null,
    };
    this.salvandoDescricao.set(true);
    this.execucaoService
      .alterar(execucao.id, dto)
      .pipe(finalize(() => this.salvandoDescricao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const alterada = resposta.dados;
            this.execucoes.update((lista) =>
              lista.map((item) =>
                item.id === execucao.id
                  ? {
                      ...item,
                      descricao:      alterada.descricao,
                      inicioData:     alterada.inicioData,
                      fimData:        alterada.fimData,
                      duracaoMinutos: alterada.duracaoMinutos,
                    }
                  : item,
              ),
            );
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução alterada com sucesso' });
            this.mostrarDialogEditar.set(false);
          }
        },
      });
  }

  campoInvalidoDescricao(): boolean {
    const controle = this.formularioEdicao.get('descricao');
    return !!(controle?.invalid && controle?.touched);
  }

  campoInvalidoInicio(): boolean {
    const controle = this.formularioEdicao.get('inicioData');
    return !!(controle?.invalid && controle?.touched);
  }

  private carregarUsuarios(): void {
    this.usuarioService.listar({ status: UsuarioStatusEnum.ATIVO, itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }

  private inicioDoDia(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
