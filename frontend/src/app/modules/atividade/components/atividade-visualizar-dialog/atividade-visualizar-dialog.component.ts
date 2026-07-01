import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  AtividadeRecuperadaDto,
  AtividadeAlterarDto,
  TagResumoDto,
  ExecucaoItemDto,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS_DICA,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { severidadeStatusAtividade, rotuloStatusAtividade } from '../../models/atividade.model';

@Component({
  selector: 'app-atividade-visualizar-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    EditorModule,
    InputTextModule,
    TabsModule,
    Tag,
    TooltipModule,
    DataBrasileiraPipe,
    MinutosParaHorasPipe,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-visualizar-dialog.component.html',
  styleUrl: './atividade-visualizar-dialog.component.scss',
})
export class AtividadeVisualizarDialogComponent {
  private readonly atividadeService = inject(AtividadeService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoVisualizar = signal<boolean>(false);
  readonly atividadeVisualizada = signal<AtividadeRecuperadaDto | null>(null);
  readonly tagsVisualizar = signal<TagResumoDto[]>([]);
  readonly execucoesVisualizar = signal<ExecucaoItemDto[]>([]);
  readonly salvandoDescricao = signal<boolean>(false);
  readonly editandoNome = signal<boolean>(false);
  readonly salvandoNome = signal<boolean>(false);

  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;

  readonly aoAlterar = output<void>();

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');

  readonly formularioDescricao = this.formBuilder.group({
    descricao: [''],
  });

  readonly formularioNome = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
  });

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly dicaCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS_DICA;

  /** Abre o dialog e carrega atividade, tags e execuções. */
  abrir(atividadeId: number): void {
    this.carregandoVisualizar.set(true);
    this.atividadeVisualizada.set(null);
    this.tagsVisualizar.set([]);
    this.execucoesVisualizar.set([]);
    this.formularioDescricao.reset({ descricao: '' });
    this.editandoNome.set(false);
    this.mostrarDialog.set(true);

    forkJoin({
      atividade:  this.atividadeService.recuperar(atividadeId),
      tags:       this.atividadeService.listarTags(atividadeId),
      execucoes:  this.atividadeService.listarExecucoesPorAtividade(atividadeId),
    })
      .pipe(finalize(() => this.carregandoVisualizar.set(false)))
      .subscribe({
        next: ({ atividade, tags, execucoes }) => {
          if (atividade.sucesso && atividade.dados) {
            this.atividadeVisualizada.set(atividade.dados);
            this.formularioDescricao.patchValue({ descricao: atividade.dados.descricao ?? '' });
          }
          if (tags.sucesso && tags.dados)           this.tagsVisualizar.set(tags.dados);
          if (execucoes.sucesso && execucoes.dados) this.execucoesVisualizar.set(execucoes.dados.itens);
        },
      });
  }

  salvarDescricao(): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade) return;

    this.salvandoDescricao.set(true);
    const dto: AtividadeAlterarDto = { descricao: this.formularioDescricao.value.descricao ?? '' };
    this.atividadeService
      .alterar(atividade.id, dto)
      .pipe(finalize(() => this.salvandoDescricao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const alterada = resposta.dados;
            this.atividadeVisualizada.update((atual) => (atual ? { ...atual, descricao: alterada.descricao } : atual));
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Descrição salva' });
          }
        },
      });
  }

  /** Entra no modo de edição do nome (só gestor), preenchendo o form com o nome atual. */
  iniciarEdicaoNome(): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade) return;
    this.formularioNome.reset({ nome: atividade.nome });
    this.editandoNome.set(true);
    setTimeout(() => this.campoNome()?.nativeElement.focus());
  }

  /** Sai do modo de edição sem salvar. */
  cancelarEdicaoNome(): void {
    this.editandoNome.set(false);
  }

  /** Salva o novo nome (gestor). Atualiza o header, emite aoAlterar, fecha o modo de edição. */
  salvarNome(): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade || this.formularioNome.invalid) return;

    const nome = (this.formularioNome.value.nome ?? '').trim();
    this.salvandoNome.set(true);
    const dto: AtividadeAlterarDto = { nome };
    this.atividadeService
      .alterar(atividade.id, dto)
      .pipe(finalize(() => this.salvandoNome.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const alterada = resposta.dados;
            this.atividadeVisualizada.update((atual) => (atual ? { ...atual, nome: alterada.nome } : atual));
            this.editandoNome.set(false);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Nome alterado' });
            this.aoAlterar.emit();
          }
        },
      });
  }

  iniciais(nome: string): string {
    return (nome ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }
}
