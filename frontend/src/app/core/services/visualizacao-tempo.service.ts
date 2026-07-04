import { Injectable, computed, signal } from '@angular/core';
import { VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE } from '../models/visualizacao-tempo.model';

/**
 * Preferência de exibição dos tempos de **demanda**: horas/minutos (padrão) ou dias.
 * Mantém a escolha num signal e persiste no `localStorage` — a preferência é do
 * navegador (não do usuário logado) e sobrevive ao logout, exatamente como o tema.
 */
@Injectable({ providedIn: 'root' })
export class VisualizacaoTempoService {
  private readonly emDiasSelecionado = signal<boolean>(this.lerSalvo());

  /** Verdadeiro quando os tempos de demanda devem aparecer em dias. */
  readonly emDias = computed<boolean>(() => this.emDiasSelecionado());

  /** Define a preferência e persiste no `localStorage`. */
  definir(emDias: boolean): void {
    this.emDiasSelecionado.set(emDias);
    localStorage.setItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE, String(emDias));
  }

  /** Alterna entre horas e dias reaproveitando `definir`. */
  alternar(): void {
    this.definir(!this.emDiasSelecionado());
  }

  /** Lê a preferência salva; ausente ou inválida = horas (false). */
  private lerSalvo(): boolean {
    return localStorage.getItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE) === 'true';
  }
}
