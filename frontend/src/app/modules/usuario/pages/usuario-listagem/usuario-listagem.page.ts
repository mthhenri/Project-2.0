import { Component, ElementRef, inject, signal, OnInit, HostListener, DestroyRef, computed, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioResumoDto, TipoUsuarioEnum, TipoUsuarioStatusEnum, UsuarioListarDto } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { rotuloTipoUsuario, severidadeTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { AnotacoesAlteradasEvento, UsuarioAnotacoesDialogComponent } from '../../components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';
import { UsuarioPerfilDialogComponent } from '../../components/usuario-perfil-dialog/usuario-perfil-dialog.component';
import { UsuarioFormularioDialogComponent } from '../../components/usuario-formulario-dialog/usuario-formulario-dialog.component';
import { UsuarioSenhaDialogComponent } from '../../components/usuario-senha-dialog/usuario-senha-dialog.component';
import { UsuarioCartaoComponent } from '../../components/usuario-cartao/usuario-cartao.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';

const CHAVE_FILTROS = 'usuario.filtros';

interface FiltrosPersistidos {
  tipo: TipoUsuarioEnum | null;
  status: TipoUsuarioStatusEnum | null;
}

@Component({
  selector: 'app-usuario-listagem',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    BarraRecargaComponent,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    ToggleSwitchModule,
    Tag,
    TooltipModule,
    UsuarioCartaoComponent,
    UsuarioAnotacoesDialogComponent,
    UsuarioPerfilDialogComponent,
    UsuarioFormularioDialogComponent,
    UsuarioSenhaDialogComponent,
  ],
  templateUrl: './usuario-listagem.page.html',
  styleUrl: './usuario-listagem.page.scss',
})
export class UsuarioListagemPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly anotacoesDialog = viewChild.required(UsuarioAnotacoesDialogComponent);

  readonly formularioFiltros = this.formBuilder.group({ busca: [''] });
  readonly tipoFiltro = signal<TipoUsuarioEnum | null>(null);
  readonly statusFiltro = signal<TipoUsuarioStatusEnum | null>(null);
  private readonly termoBusca = signal<string>('');
  readonly filtroAtivo = computed(() => !!this.tipoFiltro() || !!this.statusFiltro() || !!this.termoBusca().trim());

  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(10);

  readonly tiposOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Desenvolvedores', value: TipoUsuarioEnum.DESENVOLVEDOR },
    { label: 'Gestores', value: TipoUsuarioEnum.GESTOR },
    { label: 'Administradores', value: TipoUsuarioEnum.ADMINISTRADOR },
  ];

  readonly statusOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Ativos', value: TipoUsuarioStatusEnum.ATIVO },
    { label: 'Inativos', value: TipoUsuarioStatusEnum.INATIVO },
  ];

  ngOnInit(): void {
    const filtrosSalvos = this.lerFiltrosPersistidos();
    this.tipoFiltro.set(filtrosSalvos.tipo);
    this.statusFiltro.set(filtrosSalvos.status);

    this.formularioFiltros.controls.busca.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((busca) => {
        this.termoBusca.set(busca ?? '');
        this.aoMudarFiltro();
      });

    this.buscarUsuarios();
    this.abrirAnotacoesDoLink();
  }

  /** Deep-link `/usuario/:id/anotacoes` → `/usuario?anotacoes=:id`: abre o drawer e limpa o parâmetro. */
  private abrirAnotacoesDoLink(): void {
    const usuarioId = Number(this.route.snapshot.queryParamMap.get('anotacoes'));
    if (!usuarioId) return;
    this.anotacoesDialog().abrir(usuarioId);
    this.router.navigate([], { queryParams: { anotacoes: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** O drawer salvou: o ícone da linha acompanha sem recarregar a listagem. */
  aoAnotacoesAlteradas(evento: AnotacoesAlteradasEvento): void {
    this.usuarios.update((lista) =>
      lista.map((item) => (item.id === evento.usuarioId ? { ...item, temAnotacoes: evento.temAnotacoes } : item)),
    );
  }

  /** Recarrega a listagem sempre que a aba/janela volta a ficar visível. */
  @HostListener('document:visibilitychange')
  aoVoltarParaAba(): void {
    if (document.visibilityState === 'visible') this.buscarUsuarios();
  }

  /** `/` foca a busca. */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;
    if (evento.key === '/') {
      evento.preventDefault();
      this.campoBusca()?.nativeElement.focus();
    }
  }

  aoEsc(evento: Event): void {
    const campo = this.campoBusca()?.nativeElement;
    if (campo?.value) {
      evento.stopPropagation();
      this.formularioFiltros.controls.busca.setValue('');
    } else {
      campo?.blur();
    }
  }

  buscarUsuarios(): void {
    this.carregando.set(true);

    const filtros: UsuarioListarDto = {
      pagina: this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };
    const tipo = this.tipoFiltro();
    const status = this.statusFiltro();
    const busca = this.termoBusca().trim();
    if (tipo) filtros.tipo = tipo;
    if (status) filtros.status = status;
    if (busca) filtros.busca = busca;

    this.usuarioService
      .listar(filtros)
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.usuarios.set(resposta.dados.itens);
            this.totalRegistros.set(resposta.dados.totalItens);
          }
        },
      });
  }

  aoCarregarTabela(evento: TableLazyLoadEvent): void {
    const primeira = evento.first ?? 0;
    const linhas = evento.rows ?? 10;
    this.paginaAtual.set(Math.floor(primeira / linhas) + 1);
    this.itensPorPagina.set(linhas);
    this.buscarUsuarios();
  }

  aoMudarFiltro(): void {
    this.paginaAtual.set(1);
    this.buscarUsuarios();
  }

  aoMudarTipo(tipo: TipoUsuarioEnum | null): void {
    this.tipoFiltro.set(tipo);
    this.persistirFiltros();
    this.aoMudarFiltro();
  }

  aoMudarStatus(status: TipoUsuarioStatusEnum | null): void {
    this.statusFiltro.set(status);
    this.persistirFiltros();
    this.aoMudarFiltro();
  }

  limparFiltros(): void {
    this.tipoFiltro.set(null);
    this.statusFiltro.set(null);
    this.persistirFiltros();
    this.termoBusca.set('');
    this.formularioFiltros.controls.busca.setValue('', { emitEvent: false });
    this.aoMudarFiltro();
  }

  /** Quem pode alterar o cadastro de `usuario`: gestor, ou a própria pessoa. */
  podeEditar(usuario: UsuarioResumoDto): boolean {
    return this.podeGerenciar(usuario) || this.sessao.usuarioAtual()?.id === usuario.id;
  }

  /** Gestor gerencia todos, menos administradores: estes só o administrador gerencia. */
  podeGerenciar(usuario: UsuarioResumoDto): boolean {
    return this.sessao.eGestor() && (usuario.tipo !== TipoUsuarioEnum.ADMINISTRADOR || this.sessao.eAdministrador());
  }

  /** Inativar/excluir a si mesmo derrubaria a própria sessão: o gestor faz isso por outro gestor. */
  eOutraPessoa(usuario: UsuarioResumoDto): boolean {
    return this.sessao.usuarioAtual()?.id !== usuario.id;
  }

  /**
   * Switch de status direto na linha (task 113): a linha muda na hora, o toast oferece
   * "Desfazer" e, se o servidor recusar, o switch volta ao valor anterior.
   */
  alternarStatus(usuario: UsuarioResumoDto, ativo: boolean): void {
    const statusAnterior = usuario.status;
    const statusNovo = ativo ? TipoUsuarioStatusEnum.ATIVO : TipoUsuarioStatusEnum.INATIVO;
    if (statusAnterior === statusNovo) return;
    this.definirStatusLocal(usuario.id, statusNovo);

    this.usuarioService.alterar(usuario.id, { status: statusNovo }).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `${usuario.nomeCompleto} ${ativo ? 'ativado' : 'inativado'}`,
          desfazer: () => this.usuarioService.alterar(usuario.id, { status: statusAnterior }),
          aposDesfazer: () => this.definirStatusLocal(usuario.id, statusAnterior),
        }),
      error: () => this.definirStatusLocal(usuario.id, statusAnterior),
    });
  }

  /** Exclusão imediata (task 99): a linha sai na hora e o toast oferece "Desfazer". */
  excluir(usuario: UsuarioResumoDto): void {
    const listaAnterior = this.usuarios();
    const totalAnterior = this.totalRegistros();
    this.usuarios.set(listaAnterior.filter((item) => item.id !== usuario.id));
    this.totalRegistros.set(Math.max(0, totalAnterior - 1));

    this.usuarioService.excluir(usuario.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Usuário "${usuario.nomeCompleto}" excluído`,
          desfazer: () => this.usuarioService.restaurar(usuario.id),
          aposDesfazer: () => this.buscarUsuarios(),
        }),
      error: () => {
        this.usuarios.set(listaAnterior);
        this.totalRegistros.set(totalAnterior);
      },
    });
  }

  readonly rotuloTipo = rotuloTipoUsuario;

  severidadeTipo(tipo: TipoUsuarioEnum): 'info' | 'warn' | 'contrast' {
    return severidadeTipoUsuario(tipo);
  }

  private definirStatusLocal(usuarioId: number, status: TipoUsuarioStatusEnum): void {
    this.usuarios.update((lista) => lista.map((item) => (item.id === usuarioId ? { ...item, status } : item)));
  }

  private lerFiltrosPersistidos(): FiltrosPersistidos {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_FILTROS) ?? 'null') as Partial<FiltrosPersistidos> | null;
      const tipo = Object.values(TipoUsuarioEnum).includes(salvo?.tipo as TipoUsuarioEnum) ? (salvo!.tipo as TipoUsuarioEnum) : null;
      const status = Object.values(TipoUsuarioStatusEnum).includes(salvo?.status as TipoUsuarioStatusEnum) ? (salvo!.status as TipoUsuarioStatusEnum) : null;
      return { tipo, status };
    } catch {
      return { tipo: null, status: null };
    }
  }

  private persistirFiltros(): void {
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify({ tipo: this.tipoFiltro(), status: this.statusFiltro() }));
    } catch {
      // armazenamento indisponível: o filtro vale só para esta visita
    }
  }
}
