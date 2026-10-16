import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { UsuarioService } from '../../services/usuario.service';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { gerarSenha } from '../../utils/usuario-credenciais.util';

/** Alterar senha direto da linha (task 113): a nova senha já vem gerada, visível e copiável. */
@Component({
  selector: 'app-usuario-senha-dialog',
  standalone: true,
  imports: [DialogFormularioDirective, DialogDicaAtalhosComponent, ReactiveFormsModule, ButtonModule, InputTextModule, TooltipModule, DialogModule],
  templateUrl: './usuario-senha-dialog.component.html',
  styleUrl: './usuario-senha-dialog.component.scss',
})
export class UsuarioSenhaDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formulario = this.formBuilder.group({
    senhaNova: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  readonly senhaCopiada = signal<boolean>(false);
  readonly usuarioNome = signal<string>('');
  private usuarioId = 0;

  abrir(usuarioId: number, nomeCompleto: string): void {
    this.usuarioId = usuarioId;
    this.usuarioNome.set(nomeCompleto);
    this.gerarNovaSenha();
    this.mostrarDialog.set(true);
  }

  gerarNovaSenha(): void {
    this.senhaCopiada.set(false);
    this.formulario.reset({ senhaNova: gerarSenha() });
  }

  async copiarSenha(): Promise<void> {
    const senha = this.formulario.controls.senhaNova.value;
    if (!senha) return;
    try {
      await navigator.clipboard.writeText(senha);
      this.senhaCopiada.set(true);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Não foi possível copiar a senha' });
    }
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.carregando.set(true);
    this.usuarioService
      .alterarSenha(this.usuarioId, { senhaNova: this.formulario.controls.senhaNova.value! })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Senha alterada com sucesso' });
          this.mostrarDialog.set(false);
        },
      });
  }

  campoInvalido(): boolean {
    const controle = this.formulario.controls.senhaNova;
    return controle.invalid && controle.touched;
  }
}
