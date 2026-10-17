import { Component, inject, signal, computed, output } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { UsuarioRecuperadoDto, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { rotuloTipoUsuario, severidadeTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { AnotacoesAlteradasEvento, UsuarioAnotacoesDialogComponent } from '../usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';
import { iniciaisDoNome } from '../../utils/usuario-credenciais.util';

/**
 * Perfil em modo leitura (task 113). Editar e alterar senha vivem em dialogs próprios da
 * listagem: este componente só avisa qual foi pedido.
 */
@Component({
  selector: 'app-usuario-perfil-dialog',
  standalone: true,
  imports: [ButtonModule, Tag, DialogModule, UsuarioAnotacoesDialogComponent],
  templateUrl: './usuario-perfil-dialog.component.html',
  styleUrl: './usuario-perfil-dialog.component.scss',
})
export class UsuarioPerfilDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly editarSolicitado = output<number>();
  readonly senhaSolicitada = output<{ id: number; nomeCompleto: string }>();
  /** Emitido quando as anotações são salvas, para a listagem atualizar o ícone. */
  readonly aoAlterar = output<AnotacoesAlteradasEvento>();

  readonly usuario = signal<UsuarioRecuperadoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);

  readonly podeEditar = computed(() => {
    const usuarioAtual = this.sessao.usuarioAtual();
    const usuarioPerfil = this.usuario();
    if (!usuarioAtual || !usuarioPerfil) return false;
    return usuarioAtual.id === usuarioPerfil.id || this.sessao.eGestor();
  });

  /** Abre o dialog e carrega o usuário informado. */
  abrir(usuarioId: number): void {
    this.usuario.set(null);
    this.mostrarDialog.set(true);
    this.carregando.set(true);
    this.usuarioService
      .recuperar(usuarioId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.usuario.set(resposta.dados);
        },
      });
  }

  pedirEdicao(usuario: UsuarioRecuperadoDto): void {
    this.mostrarDialog.set(false);
    this.editarSolicitado.emit(usuario.id);
  }

  pedirSenha(usuario: UsuarioRecuperadoDto): void {
    this.mostrarDialog.set(false);
    this.senhaSolicitada.emit({ id: usuario.id, nomeCompleto: usuario.nomeCompleto });
  }

  iniciais(nomeCompleto: string): string {
    return iniciaisDoNome(nomeCompleto);
  }

  rotulaTipo(tipo: TipoUsuarioEnum): string {
    return rotuloTipoUsuario(tipo);
  }

  severidadeTipo(tipo: TipoUsuarioEnum): 'info' | 'warn' | 'contrast' {
    return severidadeTipoUsuario(tipo);
  }

  severidadeStatus(status: TipoUsuarioStatusEnum): 'success' | 'danger' {
    return status === TipoUsuarioStatusEnum.ATIVO ? 'success' : 'danger';
  }
}
