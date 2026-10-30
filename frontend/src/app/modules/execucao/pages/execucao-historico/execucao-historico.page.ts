import { montarEsqueletoDeTabela } from '../../../../shared/components/skeleton-lista/esqueleto-tabela';
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
  DestroyRef,
  Injector,
  afterNextRender,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule, DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ExecucaoListarDto,
  ExecucaoItemDto,
  ExecucaoAlterarDto,
  ExecucaoEncerrarDto,
  EstadoIaEnum,
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
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { AtividadeVisualizarDialogComponent } from '../../../atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';
import { ExecucaoAgoraComponent, ExecucaoPausaPedida } from '../../components/execucao-agora/execucao-agora.component';
import { dataParaIso, isoParaData, mensagemInicialDoChat, mesmoDia, resumoDoDia, separarExecucoes } from '../../utils/execucao.util';


type CampoEdicao = 'descricao' | 'inicio' | 'fim';

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
    TextareaModule,
    TooltipModule,
    ConfirmPopupModule,
    NgTemplateOutlet,
    MinutosParaHorasPipe,
    AtividadeVisualizarDialogComponent,
    BloquearCaracteresProibidosDirective,
    ExecucaoAgoraComponent,
  ],
  templateUrl: './execucao-historico.page.html',
  styleUrl: './execucao-historico.page.scss',
  providers: [ConfirmationService],
})
export class ExecucaoHistoricoPage implements OnInit {
  private readonly execucaoService = inject(ExecucaoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  readonly sessao = inject(UsuarioSessaoService);
  /** Os rótulos e as larguras da tabela real (Usuário e Ações só para o gestor), para o esqueleto não parecer outra tela. */
  readonly esqueleto = computed(() =>
    montarEsqueletoDeTabela([
      ...(this.sessao.eGestor() ? [{ rotulo: 'Usuário', peso: 103 }] : []),
      { rotulo: 'Atividade', peso: 260 },
      { rotulo: 'Início', peso: 76 },
      { rotulo: 'Fim', peso: 132 },
      { rotulo: 'Duração', peso: 119 },
      { rotulo: 'Descrição', peso: 300 },
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
    resumoDoDia(isoParaData(this.dataSelecionada()) ?? this.hoje, this.totalRegistros(), this.totalMinutosDia(), this.hoje, this.ativas().length),
  );
  readonly rotuloDiaVazio = computed(() => (isoParaData(this.dataSelecionada()) ?? this.hoje).toLocaleDateString('pt-BR'));

  /** A execução em andamento sai da tabela e vai para o bloco "Em andamento agora" (task 252); a tabela é só o que já fechou. */
  private readonly separadas = computed(() => separarExecucoes(this.execucoes()));
  readonly ativas = computed(() => this.separadas().ativas);
  readonly linhas = computed(() => this.separadas().encerradas);
  /** O total da API conta a ativa; o paginador da tabela, não. */
  readonly totalEncerradas = computed(() => Math.max(0, this.totalRegistros() - this.ativas().length));
  /** O bloco é do "agora": num dia passado sem execução ativa ele não aparece. */
  readonly mostrarAgora = computed(() => this.ativas().length > 0 || this.visualizandoHoje());
  /** Gestor sem filtro de usuário vê vários donos: o cartão mostra de quem é. */
  readonly agoraDeVarios = computed(() => this.sessao.eGestor() && !this.usuarioFiltradoId());
  readonly podeIniciar = computed(() => !this.sessao.eGestor());
  readonly pausando = signal<boolean>(false);

  // --- Edição inline (gestor): descrição, início e fim direto na célula ---
  readonly edicao = signal<{ execucaoId: number; campo: CampoEdicao } | null>(null);
  /** Houve saída do campo com alteração: a célula pergunta "Salvar alteração?" antes de enviar. */
  readonly confirmandoEdicao = signal<boolean>(false);
  readonly salvandoEdicao = signal<boolean>(false);
  /** Limite máximo (momento atual) para os campos de data/hora da edição. */
  readonly dataMaximaEdicao = signal<Date>(new Date());
  readonly rascunhoDescricao = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
  });
  readonly rascunhoData = new FormControl<Date | null>(null, [Validators.required]);

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  private readonly injector = inject(Injector);
  /** Seletor de data aberto na edição inline: o Esc e a confirmação precisam fechar o painel dele. */
  private seletorAtivo: DatePicker | null = null;

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

  /** Pausar é encerrar com a descrição (a mesma rota do chip da barra superior); o gestor pausa a de qualquer um. */
  pausarExecucao(pedido: ExecucaoPausaPedida): void {
    const dto: ExecucaoEncerrarDto = { descricao: pedido.descricao || undefined };
    this.pausando.set(true);
    this.execucaoService
      .encerrar(pedido.execucao.id, dto)
      .pipe(finalize(() => this.pausando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução pausada com sucesso' });
          this.buscarExecucoes();
        },
      });
  }

  /** Sem nada em andamento, o desenvolvedor volta ao chat com a mensagem pronta (ou às Atividades, com a IA fora do ar). */
  iniciarAtividade(): void {
    if (this.iaDisponibilidade.estado() !== EstadoIaEnum.NO_AR) {
      this.router.navigate(['/atividade']);
      return;
    }
    const houveExecucaoNoDia = this.linhas().length > 0;
    this.router.navigate(['/chat'], { queryParams: { mensagem: mensagemInicialDoChat(houveExecucaoNoDia) } });
  }

  /** Esc sai da edição inline. ←/→ trocam o dia, Home volta a hoje, quietos em campo de texto e com dialog/popover aberto. */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.edicao()) {
      if (this.confirmandoEdicao()) this.descartarEdicao();
      else this.aoSairDaEdicao();
      evento.preventDefault();
      return;
    }
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
  // Edição inline (apenas gestor)
  // ---------------------------------------------------------------------------

  editando(execucao: ExecucaoItemDto, campo: CampoEdicao): boolean {
    const atual = this.edicao();
    return atual?.execucaoId === execucao.id && atual.campo === campo;
  }

  /** Clique na descrição, no início ou no fim: a célula vira campo de edição já com o foco. */
  iniciarEdicao(execucao: ExecucaoItemDto, campo: CampoEdicao): void {
    if (!this.sessao.eGestor() || this.salvandoEdicao()) return;
    if (this.editando(execucao, campo)) return;
    this.encerrarEdicao();
    if (campo === 'descricao') {
      this.rascunhoDescricao.reset(execucao.descricao);
    } else {
      const instante = campo === 'inicio' ? execucao.inicioData : execucao.fimData;
      if (!instante) return;
      this.rascunhoData.reset(instanteParaRelogioLocal(new Date(instante), ambiente.fusoHorario));
      this.dataMaximaEdicao.set(instanteParaRelogioLocal(new Date(), ambiente.fusoHorario));
    }
    this.edicao.set({ execucaoId: execucao.id, campo });
    this.focarEditor();
  }

  /** Esc, clique fora ou saída do campo: sem alteração fecha em silêncio; com alteração pergunta antes de salvar. */
  aoSairDaEdicao(): void {
    if (!this.edicao() || this.confirmandoEdicao() || this.salvandoEdicao()) return;
    if (!this.edicaoAlterada()) {
      this.encerrarEdicao();
      return;
    }
    this.confirmandoEdicao.set(true);
    this.rascunhoDescricao.disable({ emitEvent: false });
    this.rascunhoData.disable({ emitEvent: false });
    this.seletorAtivo?.hideOverlay();
  }

  registrarSeletor(seletor: DatePicker): void {
    this.seletorAtivo = seletor;
  }

  /** O seletor de data perde o foco ao clicar no próprio painel: só sai quando o painel não está aberto. */
  aoSairDoSeletor(seletor: DatePicker): void {
    setTimeout(() => {
      if (!seletor.overlayVisible) this.aoSairDaEdicao();
    });
  }

  /** "Não" na pergunta: descarta o rascunho. */
  descartarEdicao(): void {
    this.encerrarEdicao();
  }

  /** "Sim" na pergunta: envia a alteração do campo editado, mantendo os outros valores da execução. */
  confirmarEdicao(): void {
    const atual = this.edicao();
    const execucao = this.execucoes().find((item) => item.id === atual?.execucaoId);
    if (!atual || !execucao) {
      this.encerrarEdicao();
      return;
    }

    // Controle desabilitado conta como válido: reabilita só para validar e trava de novo se passou.
    this.rascunhoDescricao.enable({ emitEvent: false });
    this.rascunhoData.enable({ emitEvent: false });
    const invalido = atual.campo === 'descricao' ? this.rascunhoDescricao.invalid : this.rascunhoData.invalid;
    if (!invalido) {
      this.rascunhoDescricao.disable({ emitEvent: false });
      this.rascunhoData.disable({ emitEvent: false });
    }
    if (invalido) {
      this.voltarAEditar(
        atual.campo === 'descricao' ? `A descrição é obrigatória. ${MENSAGEM_CARACTERES_PROIBIDOS}` : 'A data e a hora são obrigatórias.',
      );
      return;
    }

    const novoInstante = atual.campo === 'descricao' ? null : relogioLocalParaInstante(this.rascunhoData.getRawValue()!, ambiente.fusoHorario);
    const inicio = atual.campo === 'inicio' ? novoInstante! : new Date(execucao.inicioData);
    const fim = atual.campo === 'fim' ? novoInstante! : execucao.fimData ? new Date(execucao.fimData) : null;
    if (fim && fim <= inicio) {
      this.voltarAEditar('O fim precisa ser depois do início.');
      return;
    }

    const dto: ExecucaoAlterarDto = {
      descricao:  atual.campo === 'descricao' ? this.rascunhoDescricao.getRawValue().trim() : execucao.descricao,
      inicioData: inicio.toISOString(),
      fimData:    fim ? fim.toISOString() : null,
    };
    this.salvandoEdicao.set(true);
    this.execucaoService
      .alterar(execucao.id, dto)
      .pipe(finalize(() => this.salvandoEdicao.set(false)))
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
            this.encerrarEdicao();
            if (atual.campo !== 'descricao') this.buscarExecucoes();
          }
        },
        error: () => this.voltarAEditar(),
      });
  }

  private edicaoAlterada(): boolean {
    const atual = this.edicao();
    const execucao = this.execucoes().find((item) => item.id === atual?.execucaoId);
    if (!atual || !execucao) return false;
    if (atual.campo === 'descricao') return this.rascunhoDescricao.getRawValue().trim() !== execucao.descricao;
    const original = atual.campo === 'inicio' ? execucao.inicioData : execucao.fimData;
    const rascunho = this.rascunhoData.getRawValue();
    if (!original || !rascunho) return false;
    const segundos = (instante: Date) => Math.floor(instante.getTime() / 1000);
    return segundos(relogioLocalParaInstante(rascunho, ambiente.fusoHorario)) !== segundos(new Date(original));
  }

  /** Recusa ou falha ao salvar: o campo continua aberto para corrigir, sem perder o que foi digitado. */
  private voltarAEditar(aviso?: string): void {
    if (aviso) this.messageService.add({ severity: 'warn', summary: 'Atenção', detail: aviso });
    this.confirmandoEdicao.set(false);
    this.rascunhoDescricao.enable({ emitEvent: false });
    this.rascunhoData.enable({ emitEvent: false });
    this.focarEditor();
  }

  private encerrarEdicao(): void {
    this.seletorAtivo = null;
    this.edicao.set(null);
    this.confirmandoEdicao.set(false);
    this.rascunhoDescricao.enable({ emitEvent: false });
    this.rascunhoData.enable({ emitEvent: false });
  }

  private focarEditor(): void {
    afterNextRender(
      () => document.querySelector<HTMLElement>('.execucao-historico__editor textarea, .execucao-historico__editor input')?.focus(),
      { injector: this.injector },
    );
  }

  confirmarExclusao(evento: Event, execucao: ExecucaoItemDto): void {
    if (!this.sessao.eGestor()) return;
    this.confirmationService.confirm({
      target:      evento.currentTarget ?? evento.target ?? undefined,
      message:     'Excluir esta execução? O tempo dela deixa de contar no dia.',
      icon:        'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.excluirExecucao(execucao),
    });
  }

  private excluirExecucao(execucao: ExecucaoItemDto): void {
    this.execucaoService.excluir(execucao.id).subscribe({
      next: (resposta) => {
        if (!resposta.sucesso) return;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução excluída com sucesso' });
        this.buscarExecucoes();
      },
    });
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

  abrirRelatorio(): void {
    this.router.navigate(['/relatorio']);
  }
}
