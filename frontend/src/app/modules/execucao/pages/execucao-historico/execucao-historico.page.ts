import { montarEsqueletoDeTabela } from '../../../../shared/components/skeleton-lista/esqueleto-tabela';
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  ExecucaoItemDto,
  ExecucaoAlterarDto,
  UsuarioResumoDto,
  TipoUsuarioStatusEnum,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import {
  dataIsoNoFuso,
  diaMesNoFuso,
  horaNoFuso,
  hojeNoFuso,
  instanteParaRelogioLocal,
  relogioLocalParaInstante,
} from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { ExecucaoService } from '../../services/execucao.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { AtividadeVisualizarDialogComponent } from '../../../atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';
import { RelatorioExecucaoDialogComponent } from '../../../relatorio/components/relatorio-execucao-dialog/relatorio-execucao-dialog.component';
import { ExecucaoTimerComponent } from '../../components/execucao-timer/execucao-timer.component';
import { dataParaIso, isoParaData, mesmoDia, resumoDoDia } from '../../utils/execucao.util';

/** O fim, quando informado, precisa ser posterior ao início (mensagem inline, sem toast). */
function periodoValido(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('inicioData')?.value as Date | null;
  const fim = grupo.get('fimData')?.value as Date | null;
  return inicio && fim && fim <= inicio ? { periodo: true } : null;
}

@Component({
  selector: 'app-execucao-historico',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    BarraRecargaComponent,
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
    BloquearCaracteresProibidosDirective,
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    RelatorioExecucaoDialogComponent,
    ExecucaoTimerComponent,
  ],
  templateUrl: './execucao-historico.page.html',
  styleUrl: './execucao-historico.page.scss',
})
export class ExecucaoHistoricoPage implements OnInit {
  private readonly execucaoService = inject(ExecucaoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly sessao = inject(UsuarioSessaoService);
  /** Os rótulos e as larguras da tabela real (Usuário e Ações só para o gestor), para o esqueleto não parecer outra tela. */
  readonly esqueleto = computed(() =>
    montarEsqueletoDeTabela([
      ...(this.sessao.eGestor() ? [{ rotulo: 'Usuário', peso: 103 }] : []),
      { rotulo: 'Projeto', peso: 101 },
      { rotulo: 'Demanda', peso: 136 },
      { rotulo: 'Atividade', peso: 154 },
      { rotulo: 'Início', peso: 76 },
      { rotulo: 'Fim', peso: 132 },
      { rotulo: 'Duração', peso: 119 },
      { rotulo: 'Descrição', peso: 128 },
      ...(this.sessao.eGestor() ? [{ rotulo: 'Ações', peso: 81 }] : []),
    ]),
  );

  /** Data máxima navegável: hoje. Não é permitido visualizar dias futuros. */
  readonly hoje = hojeNoFuso(ambiente.fusoHorario);
  private readonly hojeIso = dataParaIso(this.hoje);

  readonly formularioFiltros = this.formBuilder.group({
    data:      [this.hoje as Date],
    usuarioId: [null as number | null],
  });

  readonly execucoes = signal<ExecucaoItemDto[]>([]);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly totalMinutosDia = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(50);

  /** Data atualmente em exibição (yyyy-mm-dd), espelhada para reatividade. */
  readonly dataSelecionada = signal<string>(this.hojeIso);
  readonly visualizandoHoje = computed(() => this.dataSelecionada() === this.hojeIso);
  readonly usuarioFiltradoId = signal<number | null>(null);
  readonly filtrandoMinhas = computed(() => !!this.sessao.id() && this.usuarioFiltradoId() === this.sessao.id());

  /** "Quinta-feira, 10 de julho · 5 execuções · 12h24" — contexto do que está na tela. */
  readonly resumo = computed(() =>
    resumoDoDia(isoParaData(this.dataSelecionada()) ?? this.hoje, this.totalRegistros(), this.totalMinutosDia(), this.hoje),
  );
  readonly rotuloDiaVazio = computed(() => (isoParaData(this.dataSelecionada()) ?? this.hoje).toLocaleDateString('pt-BR'));

  /** A execução em andamento fica fixada no topo da página corrente. */
  readonly linhas = computed(() => {
    const lista = this.execucoes();
    return [...lista.filter((item) => !item.fimData), ...lista.filter((item) => !!item.fimData)];
  });

  // --- Dialog: editar execução (gestor) ---
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly salvandoDescricao = signal<boolean>(false);
  readonly execucaoEmEdicao = signal<ExecucaoItemDto | null>(null);
  /** Limite máximo (momento atual) para os campos de data/hora da edição. */
  readonly dataMaximaEdicao = signal<Date>(new Date());
  readonly formularioEdicao = this.formBuilder.group(
    {
      descricao:  ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
      inicioData: [null as Date | null, [Validators.required]],
      fimData:    [null as Date | null],
    },
    { validators: periodoValido },
  );

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  /** Textarea de descrição; recebe o foco ao abrir o dialog, não o campo de início. */
  @ViewChild('descricaoEdicao') private descricaoEdicao?: ElementRef<HTMLTextAreaElement>;

  /** Dia e usuário vêm da URL (`?data=&usuario=`), que é a fonte do estado; cada mudança de URL recarrega. */
  ngOnInit(): void {
    if (this.sessao.eGestor()) this.carregarUsuarios();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      const dia = isoParaData(parametros.get('data'));
      const data = dia && dia <= this.hoje ? dia : this.hoje;
      const usuario = Number(parametros.get('usuario'));
      this.formularioFiltros.patchValue(
        { data, usuarioId: this.sessao.eGestor() && usuario > 0 ? usuario : null },
        { emitEvent: false },
      );
      this.dataSelecionada.set(dataParaIso(data));
      this.usuarioFiltradoId.set(this.formularioFiltros.value.usuarioId ?? null);
      this.paginaAtual.set(1);
      this.buscarExecucoes();
    });
  }

  /** ←/→ trocam o dia, Home volta a hoje. Quietos em campo de texto e com dialog/popover aberto. */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey || evento.shiftKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;
    if (evento.key === 'ArrowLeft') this.retornarDia();
    else if (evento.key === 'ArrowRight') this.avancarDia();
    else if (evento.key === 'Home') this.voltarParaHoje();
    else return;
    evento.preventDefault();
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

    filtros.data = this.dataSelecionada();
    const usuarioId = this.usuarioFiltradoId();
    if (this.sessao.eGestor() && usuarioId) filtros.usuarioId = usuarioId;

    this.execucaoService
      .listar(filtros)
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.execucoes.set(
              resposta.dados.itens.map((item) => ({
                ...item,
                inicioData: new Date(item.inicioData),
                fimData: item.fimData ? new Date(item.fimData) : null,
              })),
            );
            this.totalRegistros.set(resposta.dados.totalItens);
            this.totalMinutosDia.set(resposta.dados.totalMinutosDia);
          }
        },
      });
  }

  /** O carregamento inicial é da URL; aqui só entra a mudança real de página/tamanho. */
  aoCarregarTabela(evento: TableLazyLoadEvent): void {
    const primeira = evento.first ?? 0;
    const linhas = evento.rows ?? this.itensPorPagina();
    const pagina = Math.floor(primeira / linhas) + 1;
    if (pagina === this.paginaAtual() && linhas === this.itensPorPagina()) return;
    this.paginaAtual.set(pagina);
    this.itensPorPagina.set(linhas);
    this.buscarExecucoes();
  }

  /** Datepicker ou select mudaram: o novo estado vai para a URL, que dispara a busca. */
  aoMudarFiltro(): void {
    const { data, usuarioId } = this.formularioFiltros.value;
    this.atualizarUrl(data instanceof Date ? data : this.hoje, usuarioId ?? null);
  }

  voltarParaHoje(): void {
    if (this.visualizandoHoje()) return;
    this.atualizarUrl(this.hoje, this.usuarioFiltradoId());
  }

  alternarMinhas(): void {
    this.atualizarUrl(isoParaData(this.dataSelecionada()) ?? this.hoje, this.filtrandoMinhas() ? null : this.sessao.id() ?? null);
  }

  limparUsuario(): void {
    this.atualizarUrl(isoParaData(this.dataSelecionada()) ?? this.hoje, null);
  }

  private atualizarUrl(data: Date, usuarioId: number | null): void {
    this.router.navigate([], {
      queryParams: {
        data: mesmoDia(data, this.hoje) ? null : dataParaIso(data),
        usuario: this.sessao.eGestor() && usuarioId ? usuarioId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Quando o dia cruza a meia-noite a hora sozinha engana: mostra a data pequena. */
  foraDoDiaListado(data: Date | string): boolean {
    return dataIsoNoFuso(new Date(data), ambiente.fusoHorario) !== this.dataSelecionada();
  }

  /** Hora e dia/mês do instante no fuso do sistema (não no do navegador). */
  hora(data: Date | string): string {
    return horaNoFuso(new Date(data), ambiente.fusoHorario);
  }

  diaMes(data: Date | string): string {
    return diaMesNoFuso(new Date(data), ambiente.fusoHorario);
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
    const atual = isoParaData(this.dataSelecionada()) ?? this.hoje;
    const nova = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + dias);
    this.atualizarUrl(nova > this.hoje ? this.hoje : nova, this.usuarioFiltradoId());
  }

  // ---------------------------------------------------------------------------
  // Edição de descrição (apenas gestor)
  // ---------------------------------------------------------------------------

  abrirEdicao(execucao: ExecucaoItemDto): void {
    if (!this.sessao.eGestor()) return;
    this.execucaoEmEdicao.set(execucao);
    this.dataMaximaEdicao.set(instanteParaRelogioLocal(new Date(), ambiente.fusoHorario));
    this.formularioEdicao.reset({
      descricao:  execucao.descricao,
      inicioData: instanteParaRelogioLocal(new Date(execucao.inicioData), ambiente.fusoHorario),
      fimData:    execucao.fimData ? instanteParaRelogioLocal(new Date(execucao.fimData), ambiente.fusoHorario) : null,
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
    const dto: ExecucaoAlterarDto = {
      descricao:  descricao!.trim(),
      inicioData: relogioLocalParaInstante(inicioData!, ambiente.fusoHorario).toISOString(),
      fimData:    fimData ? relogioLocalParaInstante(fimData, ambiente.fusoHorario).toISOString() : null,
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
                      inicioData:     new Date(alterada.inicioData),
                      fimData:        alterada.fimData ? new Date(alterada.fimData) : null,
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
    this.usuarioService.listar({ status: TipoUsuarioStatusEnum.ATIVO, allRows: true }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }

  private inicioDoDia(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }
}
