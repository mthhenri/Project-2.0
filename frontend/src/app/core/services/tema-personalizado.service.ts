import { Injectable, effect, inject, signal } from '@angular/core';
import { palette, updatePrimaryPalette } from '@primeng/themes';
import {
  COR_CHAVE_COR,
  COR_CHAVE_DESBLOQUEADO,
  COR_CHAVE_DONO,
  PALETA_PRIMARIA_PADRAO,
} from '../models/tema-personalizado.model';
import { UsuarioSessaoService } from './usuario-sessao.service';

/**
 * Preferência de cor primária do app. Permite trocar o azul padrão por qualquer cor,
 * aplicando a escala 50–950 em runtime via `updatePrimaryPalette` — o que reflete em
 * todos os componentes (claro e escuro) que já consomem os tokens `--p-primary-*`.
 *
 * A preferência é por navegador (persistida no `localStorage`) e fica atrelada ao
 * usuário que a habilitou: ao logar com um usuário diferente, é esquecida.
 */
@Injectable({ providedIn: 'root' })
export class TemaPersonalizadoService {
  private readonly sessao = inject(UsuarioSessaoService);

  private readonly _desbloqueado = signal<boolean>(this.lerDesbloqueado());
  private readonly _corCustomizada = signal<string | null>(this.lerCorSalva());

  /** Indica se a troca de cor primária está habilitada. */
  readonly desbloqueado = this._desbloqueado.asReadonly();
  /** Cor primária escolhida (`#rrggbb`) ou `null` quando no padrão. */
  readonly corCustomizada = this._corCustomizada.asReadonly();

  constructor() {
    if (this._desbloqueado() && this._corCustomizada()) {
      this.aplicarCor(this._corCustomizada()!);
    }

    // Esquece a preferência ao logar com um usuário diferente do dono. Um id nulo
    // (logout ou boot antes de restaurar a sessão) é ignorado de propósito, para
    // que logout/refresh não apaguem a escolha do próprio dono.
    effect(() => {
      const idAtual = this.sessao.id();
      if (idAtual == null || !this._desbloqueado()) return;
      if (String(idAtual) !== this.lerDono()) {
        this.retrancar();
      }
    });
  }

  /** Habilita a troca de cor e registra o usuário atual como dono da preferência. */
  desbloquear(): void {
    this._desbloqueado.set(true);
    localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
    const idAtual = this.sessao.id();
    if (idAtual != null) {
      localStorage.setItem(COR_CHAVE_DONO, String(idAtual));
    }
  }

  /** Esquece tudo: volta ao azul, limpa a persistência e some de novo. */
  retrancar(): void {
    this._desbloqueado.set(false);
    this._corCustomizada.set(null);
    localStorage.removeItem(COR_CHAVE_DESBLOQUEADO);
    localStorage.removeItem(COR_CHAVE_COR);
    localStorage.removeItem(COR_CHAVE_DONO);
    updatePrimaryPalette(PALETA_PRIMARIA_PADRAO);
  }

  /** Define a cor primária a partir de um hex `#rrggbb` e persiste a escolha. */
  definirCor(hex: string): void {
    const corNormalizada = this.normalizarHex(hex);
    this._corCustomizada.set(corNormalizada);
    localStorage.setItem(COR_CHAVE_COR, corNormalizada);
    this.aplicarCor(corNormalizada);
  }

  /** Volta a cor primária ao azul padrão mantendo o desbloqueio. */
  resetarCor(): void {
    this._corCustomizada.set(null);
    localStorage.removeItem(COR_CHAVE_COR);
    updatePrimaryPalette(PALETA_PRIMARIA_PADRAO);
  }

  /** Gera a escala 50–950 a partir do hex e aplica como paleta primária em runtime. */
  private aplicarCor(hex: string): void {
    updatePrimaryPalette(palette(hex));
  }

  private normalizarHex(hex: string): string {
    return hex.startsWith('#') ? hex : `#${hex}`;
  }

  private lerDesbloqueado(): boolean {
    return localStorage.getItem(COR_CHAVE_DESBLOQUEADO) === 'true';
  }

  private lerCorSalva(): string | null {
    return localStorage.getItem(COR_CHAVE_COR);
  }

  private lerDono(): string | null {
    return localStorage.getItem(COR_CHAVE_DONO);
  }
}
