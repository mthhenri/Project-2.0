import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem, MessageService } from 'primeng/api';
import { ProjetoAlteradoDto, ProjetoResumoDto, TipoProjetoStatusEnum } from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { ProjetoFormularioDialogComponent } from '../../components/projeto-formulario-dialog/projeto-formulario-dialog.component';
import { ProjetoStatusChipComponent } from '../../components/projeto-status-chip/projeto-status-chip.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';
import { normalizarTexto } from '../../../demanda/utils/demanda-filtro.util';

/** O backend entrega no máximo 100 por página; a busca e os contadores trabalham sobre esses (task 112). */
const LIMITE_PROJETOS = 100;

@Component({
  selector: 'app-projeto-listagem',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    BarraRecargaComponent,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    MenuModule,
    TooltipModule,
    ProjetoFormularioDialogComponent,
    ProjetoStatusChipComponent,
  ],
  templateUrl: './projeto-listagem.page.html',
  styleUrl: './projeto-listagem.page.scss',
})
export class ProjetoListagemPage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly messageService = inject(MessageService);

  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly menuAcoes = viewChild<Menu>('menuAcoes');
  private readonly formularioDialog = viewChild.required(ProjetoFormularioDialogComponent);

  /** Todos os projetos carregados; busca e filtro de status são aplicados no cliente. */
  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());

  readonly termoBusca = signal<string>('');
  readonly statusFiltro = signal<TipoProjetoStatusEnum | null>(null);
  itensMenu: MenuItem[] = [];

  /** Projetos que atendem à busca (nome/código), antes do filtro de status: base dos contadores. */
  private readonly aposBusca = computed(() => {
    const termo = normalizarTexto(this.termoBusca().trim());
    if (!termo) return this.projetos();
    return this.projetos().filter(
      (projeto) => normalizarTexto(projeto.nome).includes(termo) || normalizarTexto(projeto.codigo).includes(termo),
    );
  });

  readonly projetosExibidos = computed(() => {
    const status = this.statusFiltro();
    return status ? this.aposBusca().filter((projeto) => projeto.status === status) : this.aposBusca();
  });

  readonly opcoesStatus = computed(() => {
    const base = this.aposBusca();
    const contar = (status: TipoProjetoStatusEnum | null) =>
      status ? base.filter((projeto) => projeto.status === status).length : base.length;
    return [
      { rotulo: 'Todos',      valor: null as TipoProjetoStatusEnum | null, contagem: contar(null) },
      { rotulo: 'Ativos',     valor: TipoProjetoStatusEnum.ATIVO as TipoProjetoStatusEnum | null,     contagem: contar(TipoProjetoStatusEnum.ATIVO) },
      { rotulo: 'Pausados',   valor: TipoProjetoStatusEnum.PAUSADO as TipoProjetoStatusEnum | null,   contagem: contar(TipoProjetoStatusEnum.PAUSADO) },
      { rotulo: 'Concluídos', valor: TipoProjetoStatusEnum.CONCLUIDO as TipoProjetoStatusEnum | null, contagem: contar(TipoProjetoStatusEnum.CONCLUIDO) },
      { rotulo: 'Cancelados', valor: TipoProjetoStatusEnum.CANCELADO as TipoProjetoStatusEnum | null, contagem: contar(TipoProjetoStatusEnum.CANCELADO) },
    ];
  });

  readonly filtroAtivo = computed(() => this.termoBusca().trim() !== '' || this.statusFiltro() !== null);

  ngOnInit(): void {
    const parametros = this.route.snapshot.queryParamMap;
    this.termoBusca.set(parametros.get('q') ?? '');
    const statusDaUrl = parametros.get('status') as TipoProjetoStatusEnum | null;
    this.statusFiltro.set(statusDaUrl && Object.values(TipoProjetoStatusEnum).includes(statusDaUrl) ? statusDaUrl : null);
    this.buscarProjetos();
  }

  /** `/` leva o foco à busca (quieto com campo em foco ou overlay aberto). */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key !== '/' || evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;
    evento.preventDefault();
    this.campoBusca()?.nativeElement.focus();
  }

  buscarProjetos(): void {
    this.carregando.set(true);
    this.projetoService
      .listar({ pagina: 1, itensPorPagina: LIMITE_PROJETOS })
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.projetos.set(resposta.dados.itens);
        },
      });
  }

  aoDigitarBusca(termo: string): void {
    this.termoBusca.set(termo);
    this.atualizarUrl();
  }

  aoMudarStatus(status: TipoProjetoStatusEnum | null): void {
    this.statusFiltro.set(status);
    this.atualizarUrl();
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.statusFiltro.set(null);
    this.atualizarUrl();
  }

  /** Busca e status na URL: o link recarregado ou compartilhado volta ao mesmo recorte. */
  private atualizarUrl(): void {
    const queryParams: Record<string, string | null> = {
      q: this.termoBusca().trim() || null,
      status: this.statusFiltro(),
    };
    this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  aoEsc(evento: Event): void {
    if (this.termoBusca()) this.aoDigitarBusca('');
    else (evento.target as HTMLElement).blur();
  }

  aoCriarProjeto(projetoId: number): void {
    this.router.navigate(['/projeto', projetoId]);
  }

  /** Projeto editado no dialog: o card muda na hora, sem recarregar a listagem. */
  aoAlterarProjeto(projeto: ProjetoAlteradoDto): void {
    this.projetos.update((lista) =>
      lista.map((item) =>
        item.id === projeto.id ? { ...item, nome: projeto.nome, cor: projeto.cor, status: projeto.status } : item,
      ),
    );
  }

  navegarParaDetalhe(projeto: ProjetoResumoDto): void {
    this.router.navigate(['/projeto', projeto.id]);
  }

  /** Kebab ⋮ do card: Editar e Excluir (gestor). */
  abrirMenu(evento: Event, projeto: ProjetoResumoDto): void {
    evento.stopPropagation();
    this.itensMenu = [
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.formularioDialog().abrirEdicao(projeto) },
      { separator: true },
      { label: 'Excluir', icon: 'pi pi-trash', command: () => this.excluir(projeto) },
    ];
    this.menuAcoes()?.toggle(evento);
  }

  /** Troca de status pela tag do card: otimista, com rollback se a API recusar. */
  alterarStatus(projeto: ProjetoResumoDto, status: TipoProjetoStatusEnum): void {
    const statusAnterior = projeto.status;
    this.aplicarStatus(projeto.id, status);
    this.projetoService.alterar(projeto.id, { status }).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' }),
      error: () => this.aplicarStatus(projeto.id, statusAnterior),
    });
  }

  private aplicarStatus(projetoId: number, status: TipoProjetoStatusEnum): void {
    this.projetos.update((lista) => lista.map((item) => (item.id === projetoId ? { ...item, status } : item)));
  }

  /** Exclusão imediata (task 99): o card sai na hora e o toast oferece "Desfazer". */
  excluir(projeto: ProjetoResumoDto): void {
    const listaAnterior = this.projetos();
    this.projetos.set(listaAnterior.filter((item) => item.id !== projeto.id));

    this.projetoService.excluir(projeto.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Projeto "${projeto.nome}" excluído`,
          desfazer: () => this.projetoService.restaurar(projeto.id),
          aposDesfazer: () => this.buscarProjetos(),
        }),
      error: () => this.projetos.set(listaAnterior),
    });
  }
}
