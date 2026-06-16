import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UsuarioResumoDto, UsuarioTipoEnum, UsuarioStatusEnum, UsuarioListarDto } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { UsuarioAnotacoesDialogComponent } from '../../components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-usuario-listagem',
  standalone: true,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, Select, Tag, TooltipModule, ConfirmDialogModule, UsuarioAnotacoesDialogComponent],
  templateUrl: './usuario-listagem.page.html',
  styleUrl: './usuario-listagem.page.scss',
  providers: [ConfirmationService],
})
export class UsuarioListagemPage implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formularioFiltros = this.formBuilder.group({
    tipo: [null as UsuarioTipoEnum | null],
    status: [null as UsuarioStatusEnum | null],
  });

  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(10);

  readonly tiposOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Desenvolvedor', value: UsuarioTipoEnum.DESENVOLVEDOR },
    { label: 'Gestor', value: UsuarioTipoEnum.GESTOR },
  ];

  readonly statusOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Ativo', value: UsuarioStatusEnum.ATIVO },
    { label: 'Inativo', value: UsuarioStatusEnum.INATIVO },
  ];

  ngOnInit(): void {
    this.buscarUsuarios();
  }

  buscarUsuarios(): void {
    this.carregando.set(true);

    const { tipo, status } = this.formularioFiltros.value;
    const filtros: UsuarioListarDto = {
      pagina: this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };
    if (tipo) filtros.tipo = tipo;
    if (status) filtros.status = status;

    this.usuarioService
      .listar(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
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

  navegarParaNovo(): void {
    this.router.navigate(['/usuario/novo']);
  }

  editarUsuario(usuario: UsuarioResumoDto): void {
    this.router.navigate(['/usuario', usuario.id]);
  }

  confirmarExclusao(usuario: UsuarioResumoDto): void {
    this.confirmationService.confirm({
      message: `Deseja excluir o usuário "${usuario.nomeCompleto}"? Esta ação não pode ser desfeita.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.excluirUsuario(usuario),
    });
  }

  severidadeTipo(tipo: UsuarioTipoEnum): 'info' | 'warn' {
    return tipo === UsuarioTipoEnum.GESTOR ? 'warn' : 'info';
  }

  severidadeStatus(status: UsuarioStatusEnum): 'success' | 'danger' {
    return status === UsuarioStatusEnum.ATIVO ? 'success' : 'danger';
  }

  private excluirUsuario(usuario: UsuarioResumoDto): void {
    this.usuarioService.excluir(usuario.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Usuário "${usuario.nomeCompleto}" excluído com sucesso`,
        });
        this.buscarUsuarios();
      },
    });
  }
}
