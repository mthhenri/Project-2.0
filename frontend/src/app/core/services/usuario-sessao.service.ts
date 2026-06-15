import { Injectable, computed, signal } from '@angular/core';
import { UsuarioRecuperadoDto } from '@project20/shared';
import { UsuarioTipoEnum } from '@project20/shared/enums';

@Injectable({ providedIn: 'root' })
export class UsuarioSessaoService {
  private readonly CHAVE_SESSAO = 'usuario_sessao';

  private readonly _usuario = signal<UsuarioRecuperadoDto | null>(null);

  readonly usuarioAtual  = this._usuario.asReadonly();
  readonly id            = computed(() => this._usuario()?.id);
  readonly login         = computed(() => this._usuario()?.login);
  readonly nomeCompleto  = computed(() => this._usuario()?.nomeCompleto);
  readonly eGestor       = computed(() => this._usuario()?.tipo === UsuarioTipoEnum.GESTOR);

  constructor() {
    this.restaurarSessao();
  }

  private restaurarSessao(): void {
    const dadosSalvos = localStorage.getItem(this.CHAVE_SESSAO);
    if (!dadosSalvos) return;
    try {
      this._usuario.set(JSON.parse(dadosSalvos));
    } catch {
      localStorage.removeItem(this.CHAVE_SESSAO);
    }
  }

  definirUsuario(usuario: UsuarioRecuperadoDto): void {
    this._usuario.set(usuario);
    localStorage.setItem(this.CHAVE_SESSAO, JSON.stringify(usuario));
  }

  limpar(): void {
    this._usuario.set(null);
    localStorage.removeItem(this.CHAVE_SESSAO);
  }
}
