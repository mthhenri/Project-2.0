import { Injectable, Renderer2, RendererFactory2, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  Tema,
  TEMA_CHAVE_LOCAL_STORAGE,
  TEMA_CLASSE_ESCURO,
  TEMA_PADRAO,
} from '../models/tema.model';

/**
 * Fonte de verdade do tema visual em runtime. Mantém o tema escolhido num signal,
 * persiste a preferência no `localStorage` e sincroniza a classe `app-escuro` no `<html>`,
 * que ativa/desativa o modo escuro do PrimeNG.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null);

  private readonly temaSelecionado = signal<Tema>(this.lerTemaSalvo());

  /** Tema corrente da sessão (`'claro'` ou `'escuro'`). */
  readonly temaAtual = computed<Tema>(() => this.temaSelecionado());

  /** Indica se o tema escuro está ativo. */
  readonly eEscuro = computed<boolean>(() => this.temaSelecionado() === 'escuro');

  constructor() {
    this.aplicarTema(this.temaSelecionado());
  }

  /**
   * Define o tema, persiste a escolha no `localStorage` e sincroniza a classe no `<html>`.
   */
  definirTema(tema: Tema): void {
    this.temaSelecionado.set(tema);
    localStorage.setItem(TEMA_CHAVE_LOCAL_STORAGE, tema);
    this.aplicarTema(tema);
  }

  /** Alterna entre claro e escuro reaproveitando `definirTema`. */
  alternarTema(): void {
    this.definirTema(this.temaSelecionado() === 'escuro' ? 'claro' : 'escuro');
  }

  /** Lê o tema salvo no `localStorage`, caindo no padrão quando não há valor válido. */
  private lerTemaSalvo(): Tema {
    const temaSalvo = localStorage.getItem(TEMA_CHAVE_LOCAL_STORAGE);
    return temaSalvo === 'escuro' || temaSalvo === 'claro' ? temaSalvo : TEMA_PADRAO;
  }

  /** Adiciona ou remove a classe `app-escuro` no elemento raiz conforme o tema. */
  private aplicarTema(tema: Tema): void {
    const elementoRaiz = this.documento.documentElement;
    if (tema === 'escuro') {
      this.renderer.addClass(elementoRaiz, TEMA_CLASSE_ESCURO);
    } else {
      this.renderer.removeClass(elementoRaiz, TEMA_CLASSE_ESCURO);
    }
  }
}
