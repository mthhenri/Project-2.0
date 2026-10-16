import { Component, inject, signal, OnInit, HostListener, DestroyRef, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { UsuarioResumoDto, TipoUsuarioEnum, TipoUsuarioStatusEnum, UsuarioListarDto } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { UsuarioAnotacoesDialogComponent } from '../../components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';
import { UsuarioPerfilDialogComponent } from '../../components/usuario-perfil-dialog/usuario-perfil-dialog.component';
import { UsuarioFormularioDialogComponent } from '../../components/usuario-formulario-dialog/usuario-formulario-dialog.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';

@Component({
  selector: 'app-usuario-listagem',
  standalone: true,
  imports: [SkeletonListaComponent, BarraRecargaComponent, ReactiveFormsModule, TableModule, ButtonModule, Select, InputTextModule, Tag, TooltipModule, UsuarioAnotacoesDialogComponent, UsuarioPerfilDialogComponent, UsuarioFormularioDialogComponent],
  templateUrl: './usuario-listagem.page.html',
  styleUrl: './usuario-listagem.page.scss',
})
export class UsuarioListagemPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly formularioFiltros = this.formBuilder.group({
    busca: [''],
    tipo: [null as TipoUsuarioEnum | null],
    status: [null as TipoUsuarioStatusEnum | null],
  });

  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(10);

  readonly tiposOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Desenvolvedor', value: TipoUsuarioEnum.DESENVOLVEDOR },
    { label: 'Gestor', value: TipoUsuarioEnum.GESTOR },
  ];

  readonly statusOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Ativo', value: TipoUsuarioStatusEnum.ATIVO },
    { label: 'Inativo', value: TipoUsuarioStatusEnum.INATIVO },
  ];

  ngOnInit(): void {
    this.formularioFiltros.controls.busca.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aoMudarFiltro());

    this.buscarUsuarios();
  }

  /** Recarrega a listagem sempre que a aba/janela volta a ficar visível. */
  @HostListener('document:visibilitychange')
  aoVoltarParaAba(): void {
    if (document.visibilityState === 'visible') this.buscarUsuarios();
  }

  buscarUsuarios(): void {
    this.carregando.set(true);

    const { tipo, status, busca } = this.formularioFiltros.value;
    const filtros: UsuarioListarDto = {
      pagina: this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };
    if (tipo) filtros.tipo = tipo;
    if (status) filtros.status = status;
    if (busca?.trim()) filtros.busca = busca.trim();

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

  severidadeTipo(tipo: TipoUsuarioEnum): 'info' | 'warn' {
    return tipo === TipoUsuarioEnum.GESTOR ? 'warn' : 'info';
  }

  severidadeStatus(status: TipoUsuarioStatusEnum): 'success' | 'danger' {
    return status === TipoUsuarioStatusEnum.ATIVO ? 'success' : 'danger';
  }
}
