import { Component, inject, signal, computed, effect, output, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { finalize, startWith } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-anotacoes-dialog',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DialogModule, EditorModule, TagModule, ConfirmDialogModule],
  templateUrl: './usuario-anotacoes-dialog.component.html',
  styleUrl: './usuario-anotacoes-dialog.component.scss',
  providers: [ConfirmationService],
})
export class UsuarioAnotacoesDialogComponent implements OnDestroy {
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emite ao fechar o dialog quando houve algum salvamento — a listagem recarrega. */
  readonly aoAlterar = output<void>();

  readonly visivel = signal(false);
  readonly carregando = signal(false);
  readonly carregandoSalvar = signal(false);
  readonly anotacoesAlteracaoData = signal<Date | string | null>(null);

  /** Marca se houve algum salvamento desde a abertura do dialog. */
  private readonly houveAlteracao = signal(false);

  private readonly usuarioId = signal(0);
  private readonly nomeCompletoUsuario = signal('');

  readonly formulario = this.formBuilder.group({
    anotacoes: [''],
  });

  /** Último conteúdo persistido (carregado do servidor ou salvo). */
  private readonly conteudoSalvo = signal<string>('');

  /** Conteúdo atual do editor, refletindo cada digitação. */
  private readonly conteudoEditor = toSignal(
    this.formulario.controls.anotacoes.valueChanges.pipe(
      startWith(this.formulario.controls.anotacoes.value),
    ),
    { initialValue: '' },
  );

  /** Verdadeiro quando há edições no editor ainda não persistidas. */
  readonly temAlteracoesNaoSalvas = computed(
    () => (this.conteudoEditor() ?? '') !== this.conteudoSalvo(),
  );

  private autoSaveSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      if (this.visivel()) {
        this.autoSaveSubscription = interval(30000).subscribe(() => this.salvarSilencioso());
      } else {
        this.autoSaveSubscription?.unsubscribe();
        this.autoSaveSubscription = null;
      }
    });
  }

  tituloDialog(): string {
    return `Anotações — ${this.nomeCompletoUsuario()}`;
  }

  abrir(usuarioId: number, nomeCompleto: string): void {
    this.usuarioId.set(usuarioId);
    this.nomeCompletoUsuario.set(nomeCompleto);
    this.houveAlteracao.set(false);
    this.carregarAnotacoes();
    this.visivel.set(true);
  }

  /**
   * Intercepta qualquer tentativa de fechar o dialog (X, ESC, clique fora). Se há
   * edições não salvas, pergunta ao usuário se quer salvar antes de fechar — só
   * fecha de fato após a decisão. Sem alterações pendentes, fecha direto.
   */
  aoTentarFechar(visivel: boolean): void {
    if (visivel) return;
    const precisaConfirmar = this.temAlteracoesNaoSalvas();
    // Fecha de fato (mantém o signal coerente com o estado real do PrimeNG) e,
    // havendo edições pendentes, pergunta se o usuário quer salvá-las.
    this.fecharEfetivamente();
    if (precisaConfirmar) {
      this.confirmationService.confirm({
        key: 'anotacoes-fechar',
        header: 'Alterações não salvas',
        message: 'Você tem anotações que ainda não foram salvas. Deseja salvar antes de fechar?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Salvar',
        rejectLabel: 'Descartar',
        accept: () => this.salvarEFechar(),
        reject: () => {},
      });
    }
  }

  /** Fecha o dialog e recarrega a listagem se algo foi salvo durante a sessão. */
  private fecharEfetivamente(): void {
    this.visivel.set(false);
    if (this.houveAlteracao()) this.aoAlterar.emit();
    this.houveAlteracao.set(false);
  }

  /** Salva as anotações pendentes e, ao concluir, fecha o dialog. */
  private salvarEFechar(): void {
    const id = this.usuarioId();
    if (!id) {
      this.fecharEfetivamente();
      return;
    }

    const anotacoesEnviadas = this.formulario.value.anotacoes ?? '';
    this.carregandoSalvar.set(true);
    this.usuarioService
      .alterar(id, { anotacoes: anotacoesEnviadas })
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: (resposta) => {
          this.conteudoSalvo.set(anotacoesEnviadas);
          this.houveAlteracao.set(true);
          this.anotacoesAlteracaoData.set(
            resposta.dados?.anotacoesAlteracaoData ?? this.anotacoesAlteracaoData(),
          );
          this.fecharEfetivamente();
        },
      });
  }

  salvar(): void {
    const id = this.usuarioId();
    if (!id) return;

    const anotacoesEnviadas = this.formulario.value.anotacoes ?? '';
    this.carregandoSalvar.set(true);
    this.usuarioService
      .alterar(id, { anotacoes: anotacoesEnviadas })
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: (resposta) => {
          this.conteudoSalvo.set(anotacoesEnviadas);
          this.houveAlteracao.set(true);
          this.anotacoesAlteracaoData.set(
            resposta.dados?.anotacoesAlteracaoData ?? this.anotacoesAlteracaoData(),
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Salvo',
            detail: 'Anotações salvas com sucesso',
          });
        },
      });
  }

  limpar(): void {
    this.confirmationService.confirm({
      key: 'anotacoes-limpar',
      message: 'Deseja apagar todas as anotações? Esta ação não pode ser desfeita.',
      header: 'Limpar anotações',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Limpar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formulario.patchValue({ anotacoes: '' });
        this.salvar();
      },
    });
  }

  ngOnDestroy(): void {
    this.autoSaveSubscription?.unsubscribe();
  }

  private salvarSilencioso(): void {
    const id = this.usuarioId();
    if (!id || this.carregandoSalvar()) return;
    const anotacoesEnviadas = this.formulario.value.anotacoes ?? '';
    this.usuarioService
      .alterar(id, { anotacoes: anotacoesEnviadas })
      .subscribe({
        next: (resposta) => {
          this.conteudoSalvo.set(anotacoesEnviadas);
          this.houveAlteracao.set(true);
          this.anotacoesAlteracaoData.set(
            resposta.dados?.anotacoesAlteracaoData ?? this.anotacoesAlteracaoData(),
          );
        },
      });
  }

  private carregarAnotacoes(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.carregando.set(true);
    this.usuarioService
      .recuperar(id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const anotacoesCarregadas = resposta.dados.anotacoes ?? '';
            this.formulario.patchValue({ anotacoes: anotacoesCarregadas });
            this.conteudoSalvo.set(anotacoesCarregadas);
            this.anotacoesAlteracaoData.set(resposta.dados.anotacoesAlteracaoData ?? null);
          }
        },
      });
  }
}
