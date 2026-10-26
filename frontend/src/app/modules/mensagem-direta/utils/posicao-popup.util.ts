import { PosicaoPopupChatEnum } from '@project20/shared';

// Lógica pura da posição e do tamanho do popup do chat (task 221): onde cada posição preferida o põe, o limite pela janela, o arrasto, a alça de redimensionar e o
// registro do que o usuário arrastou (no navegador). Nada aqui conhece Angular nem o DOM, para testar sem montar componente.

export interface Retangulo {
  esquerda: number;
  topo: number;
  largura: number;
  altura: number;
}

export interface Janela {
  largura: number;
  altura: number;
}

export interface Tamanho {
  largura: number;
  altura: number;
}

/** Os quatro cantos do popup: o da âncora fica parado ao redimensionar, e a alça fica no oposto. */
export type CantoDoPopup = 'SUPERIOR_ESQUERDO' | 'SUPERIOR_DIREITO' | 'INFERIOR_ESQUERDO' | 'INFERIOR_DIREITO';

/** O tamanho de antes da task: 392×640. */
export const TAMANHO_PADRAO_DO_POPUP: Tamanho = { largura: 392, altura: 640 };
export const TAMANHO_MINIMO_DO_POPUP: Tamanho = { largura: 360, altura: 480 };
/** Folga mínima entre o popup e a borda da janela (o limite). */
export const MARGEM_DA_JANELA_PX = 16;
/** Distância do canto da tela às posições de canto (1,5 rem, como o popup sempre ficou). */
export const MARGEM_DA_ANCORA_PX = 24;
/** Passo das setas na alça de redimensionar, e o passo com Shift. */
export const PASSO_DO_TECLADO_PX = 16;
export const PASSO_GRANDE_DO_TECLADO_PX = 64;

const PREFIXO_DA_CHAVE = 'project20:chat-popup:v1:';

export const POSICOES_DO_POPUP: { valor: PosicaoPopupChatEnum; rotulo: string }[] = [
  { valor: PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, rotulo: 'Canto inferior direito' },
  { valor: PosicaoPopupChatEnum.CANTO_INFERIOR_ESQUERDO, rotulo: 'Canto inferior esquerdo' },
  { valor: PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO, rotulo: 'Canto superior direito' },
  { valor: PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, rotulo: 'Canto superior esquerdo' },
  { valor: PosicaoPopupChatEnum.CENTRO, rotulo: 'Centro' },
];

function entre(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

/**
 * O tamanho que cabe na janela: pelo menos o mínimo e no máximo a janela menos a margem. Numa janela menor que o mínimo o máximo vence (o popup nunca passa da
 * janela, mesmo abaixo de 360×480).
 */
export function limitarTamanho(tamanho: Tamanho, janela: Janela): Tamanho {
  const maxLargura = Math.max(1, janela.largura - 2 * MARGEM_DA_JANELA_PX);
  const maxAltura = Math.max(1, janela.altura - 2 * MARGEM_DA_JANELA_PX);
  return {
    largura: Math.round(Math.min(Math.max(tamanho.largura, TAMANHO_MINIMO_DO_POPUP.largura), maxLargura)),
    altura: Math.round(Math.min(Math.max(tamanho.altura, TAMANHO_MINIMO_DO_POPUP.altura), maxAltura)),
  };
}

/** O popup dentro da janela, com o tamanho limitado e a posição puxada para dentro (nunca passa da margem). */
export function limitarPopup(retangulo: Retangulo, janela: Janela): Retangulo {
  const { largura, altura } = limitarTamanho(retangulo, janela);
  return {
    largura,
    altura,
    esquerda: Math.round(entre(retangulo.esquerda, MARGEM_DA_JANELA_PX, janela.largura - largura - MARGEM_DA_JANELA_PX)),
    topo: Math.round(entre(retangulo.topo, MARGEM_DA_JANELA_PX, janela.altura - altura - MARGEM_DA_JANELA_PX)),
  };
}

/** Onde a posição preferida põe um popup do tamanho dado (já limitado à janela). */
export function ancorarPopup(posicao: PosicaoPopupChatEnum, tamanho: Tamanho, janela: Janela): Retangulo {
  const { largura, altura } = limitarTamanho(tamanho, janela);
  const direita = janela.largura - largura - MARGEM_DA_ANCORA_PX;
  const base = janela.altura - altura - MARGEM_DA_ANCORA_PX;
  const centroX = (janela.largura - largura) / 2;
  const centroY = (janela.altura - altura) / 2;
  const [esquerda, topo] = {
    [PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO]: [direita, base],
    [PosicaoPopupChatEnum.CANTO_INFERIOR_ESQUERDO]: [MARGEM_DA_ANCORA_PX, base],
    [PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO]: [direita, MARGEM_DA_ANCORA_PX],
    [PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO]: [MARGEM_DA_ANCORA_PX, MARGEM_DA_ANCORA_PX],
    [PosicaoPopupChatEnum.CENTRO]: [centroX, centroY],
  }[posicao];
  return limitarPopup({ esquerda, topo, largura, altura }, janela);
}

/** Move o popup, sempre dentro da janela. */
export function moverPopup(retangulo: Retangulo, deltaX: number, deltaY: number, janela: Janela): Retangulo {
  return limitarPopup({ ...retangulo, esquerda: retangulo.esquerda + deltaX, topo: retangulo.topo + deltaY }, janela);
}

/** O canto da tela mais próximo do centro do popup: é a âncora, e a alça de redimensionar fica no canto oposto dele. */
export function cantoDaAncora(retangulo: Retangulo, janela: Janela): CantoDoPopup {
  const aEsquerda = retangulo.esquerda + retangulo.largura / 2 < janela.largura / 2;
  const emCima = retangulo.topo + retangulo.altura / 2 < janela.altura / 2;
  if (emCima) return aEsquerda ? 'SUPERIOR_ESQUERDO' : 'SUPERIOR_DIREITO';
  return aEsquerda ? 'INFERIOR_ESQUERDO' : 'INFERIOR_DIREITO';
}

export function cantoDaAlca(retangulo: Retangulo, janela: Janela): CantoDoPopup {
  const oposto: Record<CantoDoPopup, CantoDoPopup> = {
    SUPERIOR_ESQUERDO: 'INFERIOR_DIREITO',
    SUPERIOR_DIREITO: 'INFERIOR_ESQUERDO',
    INFERIOR_ESQUERDO: 'SUPERIOR_DIREITO',
    INFERIOR_DIREITO: 'SUPERIOR_ESQUERDO',
  };
  return oposto[cantoDaAncora(retangulo, janela)];
}

/**
 * Redimensiona puxando a alça de um canto: o canto oposto (a âncora) não sai do lugar. `deltaX` e `deltaY` são o quanto o ponteiro andou desde o início do
 * arrasto, e `inicial` é o retângulo daquele momento. O tamanho respeita o mínimo e o espaço que sobra entre a âncora e a margem da janela.
 */
export function redimensionarPopup(inicial: Retangulo, alca: CantoDoPopup, deltaX: number, deltaY: number, janela: Janela): Retangulo {
  const puxaEsquerda = alca === 'SUPERIOR_ESQUERDO' || alca === 'INFERIOR_ESQUERDO';
  const puxaTopo = alca === 'SUPERIOR_ESQUERDO' || alca === 'SUPERIOR_DIREITO';
  const direitaFixa = inicial.esquerda + inicial.largura;
  const baseFixa = inicial.topo + inicial.altura;

  const espacoX = puxaEsquerda ? direitaFixa - MARGEM_DA_JANELA_PX : janela.largura - MARGEM_DA_JANELA_PX - inicial.esquerda;
  const espacoY = puxaTopo ? baseFixa - MARGEM_DA_JANELA_PX : janela.altura - MARGEM_DA_JANELA_PX - inicial.topo;
  const largura = Math.round(entre(inicial.largura + (puxaEsquerda ? -deltaX : deltaX), TAMANHO_MINIMO_DO_POPUP.largura, espacoX));
  const altura = Math.round(entre(inicial.altura + (puxaTopo ? -deltaY : deltaY), TAMANHO_MINIMO_DO_POPUP.altura, espacoY));
  return limitarPopup(
    { largura, altura, esquerda: puxaEsquerda ? direitaFixa - largura : inicial.esquerda, topo: puxaTopo ? baseFixa - altura : inicial.topo },
    janela,
  );
}

// ---------------------------------------------------------------------------
// O arranjo que o usuário fez, guardado no navegador (por usuário)
// ---------------------------------------------------------------------------

export function chaveDoArranjo(usuarioId: number): string {
  return `${PREFIXO_DA_CHAVE}${usuarioId}`;
}

export function serializarArranjo(retangulo: Retangulo): string {
  return JSON.stringify({ esquerda: retangulo.esquerda, topo: retangulo.topo, largura: retangulo.largura, altura: retangulo.altura });
}

/** O arranjo guardado, já limitado à janela de agora; texto ausente, corrompido ou com número inválido vale "sem arranjo" (`null`). */
export function lerArranjo(texto: string | null | undefined, janela: Janela): Retangulo | null {
  if (!texto) return null;
  let lido: unknown;
  try {
    lido = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof lido !== 'object' || lido === null) return null;
  const { esquerda, topo, largura, altura } = lido as Record<string, unknown>;
  const numeros = [esquerda, topo, largura, altura];
  if (!numeros.every((numero) => typeof numero === 'number' && Number.isFinite(numero))) return null;
  return limitarPopup({ esquerda: esquerda as number, topo: topo as number, largura: largura as number, altura: altura as number }, janela);
}
