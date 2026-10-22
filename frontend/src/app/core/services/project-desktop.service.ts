import { Injectable, NgZone, inject, signal } from '@angular/core';

/** O aviso que a página entrega ao Desktop quando o Project está oculto (vira notificação do sistema). */
export interface AvisoParaODesktop {
  usuarioId: number;
  usuarioNome: string;
  texto: string;
  mencionaVoce: boolean;
  som: boolean;
}

export interface SituacaoDoAtalho {
  /** O atalho que a preferência do usuário pede; `null` sem login. */
  atalho: string | null;
  /** O sistema aceitou o atalho (falso quando outro programa já usa a combinação). */
  registrado: boolean;
}

/** A ponte que o Project Desktop expõe à página (`desktop/src/preload.ts`); no navegador comum, e nos executáveis anteriores ao chat, ela não existe. */
interface PonteDoDesktop {
  aoPedirChat?(ouvinte: (pedido: { areaDeTransferencia: string | null }) => void): () => void;
  aoPedirNavegacao?(ouvinte: (pedido: { caminho: string }) => void): () => void;
  aoPedirConversa?(ouvinte: (pedido: { usuarioId: number; usuarioNome: string }) => void): () => void;
  aoMudarVisibilidade?(ouvinte: (estado: { oculta: boolean }) => void): () => void;
  informarConversa?(usuarioId: number | null): void;
  avisarMensagem?(aviso: AvisoParaODesktop): void;
  pegarRascunho?(): Promise<string | null>;
  fecharChat?(): void;
  abrirNoProject?(caminho: string): void;
  situacaoDoAtalho?(): Promise<SituacaoDoAtalho>;
}

const SEM_OUVINTE = () => undefined;

/**
 * O chat entre colaboradores no Project Desktop (task 213), do lado da página. Tudo é opcional: no navegador, ou num Desktop sem a ponte do chat
 * (executável antigo), `disponivel` é falso e as chamadas não fazem nada. A página nunca fala com o Electron além destas funções.
 */
@Injectable({ providedIn: 'root' })
export class ProjectDesktopService {
  private readonly ponte = (window as unknown as { projectDesktop?: PonteDoDesktop }).projectDesktop ?? null;
  /** Os ouvintes da ponte rodam fora da zona do Angular (o preload vive noutro mundo): cada resposta volta para dentro dela. */
  private readonly zona = inject(NgZone);

  /** A janela do Project está oculta ou minimizada. A página não percebe isso sozinha: o Electron mantém `visibilityState` em `visible` com a janela oculta. */
  readonly oculto = signal(false);

  /** Esta página é a janela de chat do Desktop (a rota `/chat-popup`), não o Project. */
  readonly naJanelaDeChat = window.location.pathname.startsWith('/chat-popup');

  /** Está dentro de um Project Desktop que conhece o chat. */
  readonly disponivel = typeof this.ponte?.avisarMensagem === 'function';

  constructor() {
    this.ponte?.aoMudarVisibilidade?.((estado) => this.zona.run(() => this.oculto.set(estado.oculta)));
  }

  /** A página está fora da vista de quem usa: aba em segundo plano ou, no Desktop, janela oculta ou minimizada. */
  paginaOculta(): boolean {
    return document.visibilityState === 'hidden' || this.oculto();
  }

  /** O atalho global foi apertado com o Project à vista: abre o popup interno (com o texto copiado, se havia). */
  aoPedirChat(ouvinte: (areaDeTransferencia: string | null) => void): () => void {
    return this.ponte?.aoPedirChat?.((pedido) => this.zona.run(() => ouvinte(pedido.areaDeTransferencia))) ?? SEM_OUVINTE;
  }

  /** A janela de chat pediu uma rota do Project (um link de demanda ou atividade). */
  aoPedirNavegacao(ouvinte: (caminho: string) => void): () => void {
    return this.ponte?.aoPedirNavegacao?.((pedido) => this.zona.run(() => ouvinte(pedido.caminho))) ?? SEM_OUVINTE;
  }

  /** O clique numa notificação pediu a janela de chat numa conversa (com a janela já aberta). */
  aoPedirConversa(ouvinte: (usuarioId: number, usuarioNome: string) => void): () => void {
    return this.ponte?.aoPedirConversa?.((pedido) => this.zona.run(() => ouvinte(pedido.usuarioId, pedido.usuarioNome))) ?? SEM_OUVINTE;
  }

  avisarMensagem(aviso: AvisoParaODesktop): void {
    this.ponte?.avisarMensagem?.(aviso);
  }

  /** A janela de chat diz ao Desktop qual conversa está à vista (ou `null`), para ele não notificar o que o usuário já está lendo. */
  informarConversa(usuarioId: number | null): void {
    this.ponte?.informarConversa?.(usuarioId);
  }

  /** O texto copiado no instante do atalho, entregue uma única vez à janela de chat. */
  async pegarRascunho(): Promise<string | null> {
    try {
      return (await this.ponte?.pegarRascunho?.()) ?? null;
    } catch {
      return null;
    }
  }

  fecharChat(): void {
    this.ponte?.fecharChat?.();
  }

  abrirNoProject(caminho: string): void {
    this.ponte?.abrirNoProject?.(caminho);
  }

  async situacaoDoAtalho(): Promise<SituacaoDoAtalho | null> {
    try {
      return (await this.ponte?.situacaoDoAtalho?.()) ?? null;
    } catch {
      return null;
    }
  }
}
