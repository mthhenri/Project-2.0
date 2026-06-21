import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjetoResumoDto, ProjetoListarDto, ProjetoStatusEnum } from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { ProjetoFormularioDialogComponent } from '../../components/projeto-formulario-dialog/projeto-formulario-dialog.component';

@Component({
  selector: 'app-projeto-listagem',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, Select, Tag, TooltipModule, ConfirmDialogModule, PaginatorModule, ProjetoFormularioDialogComponent],
  templateUrl: './projeto-listagem.page.html',
  styleUrl: './projeto-listagem.page.scss',
  providers: [ConfirmationService],
})
export class ProjetoListagemPage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly router = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formularioFiltros = this.formBuilder.group({
    status: [null as ProjetoStatusEnum | null],
  });

  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(12);

  readonly statusOpcoes = [
    { label: 'Todos', value: null },
    { label: 'Ativo', value: ProjetoStatusEnum.ATIVO },
    { label: 'Pausado', value: ProjetoStatusEnum.PAUSADO },
    { label: 'Concluído', value: ProjetoStatusEnum.CONCLUIDO },
    { label: 'Cancelado', value: ProjetoStatusEnum.CANCELADO },
  ];

  ngOnInit(): void {
    this.buscarProjetos();
  }

  buscarProjetos(): void {
    this.carregando.set(true);

    const { status } = this.formularioFiltros.value;
    const filtros: ProjetoListarDto = {
      pagina: this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };
    if (status) filtros.status = status;

    this.projetoService
      .listar(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.projetos.set(resposta.dados.itens);
            this.totalRegistros.set(resposta.dados.totalItens);
          }
        },
      });
  }

  aoMudarFiltro(): void {
    this.paginaAtual.set(1);
    this.buscarProjetos();
  }

  aoMudarPagina(evento: PaginatorState): void {
    const linhas = evento.rows ?? this.itensPorPagina();
    const primeira = evento.first ?? 0;
    this.itensPorPagina.set(linhas);
    this.paginaAtual.set(Math.floor(primeira / linhas) + 1);
    this.buscarProjetos();
  }

  aoCriarProjeto(projetoId: number): void {
    this.router.navigate(['/projeto', projetoId]);
  }

  navegarParaDetalhe(projeto: ProjetoResumoDto): void {
    this.router.navigate(['/projeto', projeto.id]);
  }

  confirmarExclusao(projeto: ProjetoResumoDto, evento: Event): void {
    evento.stopPropagation();
    this.confirmationService.confirm({
      message: `Deseja excluir o projeto "${projeto.nome}"? Esta ação não pode ser desfeita.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.excluirProjeto(projeto),
    });
  }

  severidadeStatus(status: ProjetoStatusEnum): 'success' | 'warn' | 'info' | 'danger' {
    const mapa: Record<ProjetoStatusEnum, 'success' | 'warn' | 'info' | 'danger'> = {
      [ProjetoStatusEnum.ATIVO]:     'success',
      [ProjetoStatusEnum.PAUSADO]:   'warn',
      [ProjetoStatusEnum.CONCLUIDO]: 'info',
      [ProjetoStatusEnum.CANCELADO]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: ProjetoStatusEnum): string {
    const mapa: Record<ProjetoStatusEnum, string> = {
      [ProjetoStatusEnum.ATIVO]:     'Ativo',
      [ProjetoStatusEnum.PAUSADO]:   'Pausado',
      [ProjetoStatusEnum.CONCLUIDO]: 'Concluído',
      [ProjetoStatusEnum.CANCELADO]: 'Cancelado',
    };
    return mapa[status];
  }

  private excluirProjeto(projeto: ProjetoResumoDto): void {
    this.projetoService.excluir(projeto.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Projeto "${projeto.nome}" excluído com sucesso`,
        });
        this.buscarProjetos();
      },
    });
  }
}
