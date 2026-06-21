import { Component, inject, signal, computed, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import {
  UsuarioRecuperadoDto,
  UsuarioAlterarDto,
  UsuarioSenhaAlterarDto,
  UsuarioTipoEnum,
  UsuarioStatusEnum,
} from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { UsuarioAnotacoesDialogComponent } from '../usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-usuario-perfil-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, Select, InputNumberModule, Tag, DialogModule, UsuarioAnotacoesDialogComponent],
  templateUrl: './usuario-perfil-dialog.component.html',
  styleUrl: './usuario-perfil-dialog.component.scss',
})
export class UsuarioPerfilDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emitido quando o perfil é alterado com sucesso, para a listagem recarregar. */
  readonly aoAlterar = output<void>();

  readonly usuario = signal<UsuarioRecuperadoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly mostrarDialogSenha = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);

  readonly formularioEditar = this.formBuilder.group({
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    cargoTitulo: ['', [Validators.required]],
    horasDiariasNecessarias: [8, [Validators.required]],
    status: [UsuarioStatusEnum.ATIVO as UsuarioStatusEnum, [Validators.required]],
    tipo: [UsuarioTipoEnum.DESENVOLVEDOR as UsuarioTipoEnum, [Validators.required]],
  });

  readonly formularioSenha = this.formBuilder.group(
    {
      senhaNova: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenhaNova: ['', [Validators.required]],
    },
    { validators: this.validarSenhasIguais },
  );

  readonly statusOpcoes = [
    { label: 'Ativo', value: UsuarioStatusEnum.ATIVO },
    { label: 'Inativo', value: UsuarioStatusEnum.INATIVO },
  ];

  readonly tiposOpcoes = [
    { label: 'Desenvolvedor', value: UsuarioTipoEnum.DESENVOLVEDOR },
    { label: 'Gestor', value: UsuarioTipoEnum.GESTOR },
  ];

  readonly podeEditar = computed(() => {
    const usuarioAtual = this.sessao.usuarioAtual();
    const usuarioPerfil = this.usuario();
    if (!usuarioAtual || !usuarioPerfil) return false;
    return usuarioAtual.id === usuarioPerfil.id || this.sessao.eGestor();
  });

  /**
   * Só gestores podem alterar o tipo de um usuário (evita auto-promoção de desenvolvedor),
   * e nunca o do próprio perfil (um gestor não pode rebaixar a si mesmo).
   */
  readonly podeEditarTipo = computed(() => {
    const usuarioAtual = this.sessao.usuarioAtual();
    const usuarioPerfil = this.usuario();
    if (!usuarioAtual || !usuarioPerfil) return false;
    return this.sessao.eGestor() && usuarioAtual.id !== usuarioPerfil.id;
  });

  /** Abre o dialog e carrega o usuário informado. */
  abrir(usuarioId: number): void {
    this.usuario.set(null);
    this.mostrarDialog.set(true);
    this.carregarUsuario(usuarioId);
  }

  abrirDialogEditar(): void {
    const usuarioDados = this.usuario();
    if (!usuarioDados) return;
    this.formularioEditar.patchValue({
      nomeCompleto: usuarioDados.nomeCompleto,
      cargoTitulo: usuarioDados.cargoTitulo,
      horasDiariasNecessarias: usuarioDados.horasDiariasNecessarias,
      status: usuarioDados.status,
      tipo: usuarioDados.tipo,
    });
    this.mostrarDialogEditar.set(true);
  }

  salvarEdicao(): void {
    if (this.formularioEditar.invalid) {
      this.formularioEditar.markAllAsTouched();
      return;
    }

    const usuarioDados = this.usuario();
    if (!usuarioDados) return;

    const dto: UsuarioAlterarDto = {
      nomeCompleto: this.formularioEditar.value.nomeCompleto ?? undefined,
      cargoTitulo: this.formularioEditar.value.cargoTitulo ?? undefined,
      horasDiariasNecessarias: this.formularioEditar.value.horasDiariasNecessarias ?? undefined,
      status: this.formularioEditar.value.status ?? undefined,
    };

    // Só gestores podem reclassificar o tipo; o campo nem aparece para desenvolvedor.
    if (this.podeEditarTipo()) {
      dto.tipo = this.formularioEditar.value.tipo ?? undefined;
    }

    this.carregandoSalvar.set(true);
    this.usuarioService
      .alterar(usuarioDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Perfil alterado com sucesso',
          });
          this.mostrarDialogEditar.set(false);
          this.carregarUsuario(usuarioDados.id);
          this.aoAlterar.emit();
        },
      });
  }

  abrirDialogSenha(): void {
    this.formularioSenha.reset();
    this.mostrarDialogSenha.set(true);
  }

  salvarSenha(): void {
    if (this.formularioSenha.invalid) {
      this.formularioSenha.markAllAsTouched();
      return;
    }

    const usuarioDados = this.usuario();
    if (!usuarioDados) return;

    const dto: UsuarioSenhaAlterarDto = {
      senhaNova: this.formularioSenha.value.senhaNova!,
    };

    this.carregandoSalvar.set(true);
    this.usuarioService
      .alterarSenha(usuarioDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Senha alterada com sucesso',
          });
          this.mostrarDialogSenha.set(false);
          this.formularioSenha.reset();
        },
      });
  }

  rotulaTipo(tipo: UsuarioTipoEnum): string {
    return tipo === UsuarioTipoEnum.GESTOR ? 'Gestor' : 'Desenvolvedor';
  }

  severidadeTipo(tipo: UsuarioTipoEnum): 'info' | 'warn' {
    return tipo === UsuarioTipoEnum.GESTOR ? 'warn' : 'info';
  }

  severidadeStatus(status: UsuarioStatusEnum): 'success' | 'danger' {
    return status === UsuarioStatusEnum.ATIVO ? 'success' : 'danger';
  }

  campoEditarInvalido(nomeCampo: string): boolean {
    const controle = this.formularioEditar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  campoSenhaInvalido(nomeCampo: string): boolean {
    const controle = this.formularioSenha.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  get senhasNaoConferem(): boolean {
    return !!(
      this.formularioSenha.hasError('senhasNaoConferem') &&
      this.formularioSenha.get('confirmarSenhaNova')?.touched
    );
  }

  private carregarUsuario(identificador: number): void {
    this.carregando.set(true);
    this.usuarioService
      .recuperar(identificador)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.usuario.set(resposta.dados);
          }
        },
      });
  }

  private validarSenhasIguais(controle: AbstractControl): ValidationErrors | null {
    const senhaNova = controle.get('senhaNova')?.value;
    const confirmarSenhaNova = controle.get('confirmarSenhaNova')?.value;
    if (senhaNova && confirmarSenhaNova && senhaNova !== confirmarSenhaNova) {
      return { senhasNaoConferem: true };
    }
    return null;
  }
}
