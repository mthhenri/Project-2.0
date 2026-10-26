import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import {
  Janela,
  Retangulo,
  TAMANHO_PADRAO_DO_POPUP,
  ancorarPopup,
  cantoDaAlca,
  chaveDoArranjo,
  lerArranjo,
  limitarPopup,
  serializarArranjo,
} from '../utils/posicao-popup.util';
import { MensagemDiretaAvisosService } from './mensagem-direta-avisos.service';

function janelaAtual(): Janela {
  return { largura: window.innerWidth, altura: window.innerHeight };
}

/**
 * Onde o popup do chat está na tela (task 221). Vale o que o usuário arrastou ou redimensionou (guardado no `localStorage`, por usuário) e, sem isso, a **posição
 * preferida** da conta com o tamanho padrão. O resultado é sempre relimitado à janela de agora, então um popup nunca fica fora dela. A conta só guarda a posição
 * preferida; o arranjo é conveniência do navegador, e sem `localStorage` o popup funciona só na sessão.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaPosicaoService {
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly avisos = inject(MensagemDiretaAvisosService);

  readonly janela = signal<Janela>(janelaAtual());
  /**
   * O que o usuário fez à mão; `null` = vale a posição preferida. Vem do que está guardado para quem está logado (trocar de usuário no mesmo navegador troca o
   * arranjo) e muda por `arranjo.set`, no arrasto, e por `definir`/`restaurar`.
   */
  readonly arranjo = linkedSignal<number | undefined, Retangulo | null>({
    source: this.sessao.id,
    computation: (usuarioId) => (usuarioId === undefined ? null : lerArranjo(this.lerGuardado(usuarioId), janelaAtual())),
  });

  readonly retangulo = computed<Retangulo>(() => {
    const janela = this.janela();
    const arranjo = this.arranjo();
    return arranjo ? limitarPopup(arranjo, janela) : ancorarPopup(this.avisos.preferencia().posicaoPopup, TAMANHO_PADRAO_DO_POPUP, janela);
  });
  /** O canto onde fica a alça de redimensionar (o oposto ao da âncora). */
  readonly cantoDaAlca = computed(() => cantoDaAlca(this.retangulo(), this.janela()));

  atualizarJanela(): void {
    this.janela.set(janelaAtual());
  }

  /** O arranjo novo (arrasto ou alça): limitado à janela e guardado. */
  definir(retangulo: Retangulo): void {
    const limitado = limitarPopup(retangulo, this.janela());
    this.arranjo.set(limitado);
    this.guardar(limitado);
  }

  /** Descarta o arranjo e volta à posição preferida (a que vem da conta). */
  restaurar(): void {
    this.arranjo.set(null);
    this.guardar(null);
  }

  private lerGuardado(usuarioId: number): string | null {
    try {
      return localStorage.getItem(chaveDoArranjo(usuarioId));
    } catch {
      return null;
    }
  }

  private guardar(retangulo: Retangulo | null): void {
    const usuarioId = this.sessao.id();
    if (usuarioId === undefined) return;
    try {
      if (retangulo) localStorage.setItem(chaveDoArranjo(usuarioId), serializarArranjo(retangulo));
      else localStorage.removeItem(chaveDoArranjo(usuarioId));
    } catch {
      // Sem storage (janela anônima, bloqueio): o arranjo vale só até recarregar.
    }
  }
}
