import { describe, it, expect } from 'vitest';
import { PosicaoPopupChatEnum } from '@project20/shared';
import {
  MARGEM_DA_ANCORA_PX,
  MARGEM_DA_JANELA_PX,
  TAMANHO_MINIMO_DO_POPUP,
  TAMANHO_PADRAO_DO_POPUP,
  ancorarPopup,
  cantoDaAlca,
  cantoDaAncora,
  chaveDoArranjo,
  lerArranjo,
  limitarPopup,
  limitarTamanho,
  moverPopup,
  redimensionarPopup,
  serializarArranjo,
} from './posicao-popup.util';

const JANELA = { largura: 1366, altura: 768 };

describe('posicao-popup.util — âncoras', () => {
  it('cada posição preferida põe o popup no seu canto, com a margem de sempre', () => {
    const { largura, altura } = TAMANHO_PADRAO_DO_POPUP;
    expect(ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA)).toEqual({
      esquerda: JANELA.largura - largura - MARGEM_DA_ANCORA_PX, topo: JANELA.altura - altura - MARGEM_DA_ANCORA_PX, largura, altura,
    });
    expect(ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, JANELA)).toMatchObject({ esquerda: MARGEM_DA_ANCORA_PX, topo: JANELA.altura - altura - MARGEM_DA_ANCORA_PX });
    expect(ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA)).toMatchObject({ esquerda: JANELA.largura - largura - MARGEM_DA_ANCORA_PX, topo: MARGEM_DA_ANCORA_PX });
    expect(ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, JANELA)).toMatchObject({ esquerda: MARGEM_DA_ANCORA_PX, topo: MARGEM_DA_ANCORA_PX });
  });

  it('o centro fica no meio da janela', () => {
    const centro = ancorarPopup(PosicaoPopupChatEnum.CENTRO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    expect(centro.esquerda + centro.largura / 2).toBeCloseTo(JANELA.largura / 2, 0);
    expect(centro.topo + centro.altura / 2).toBeCloseTo(JANELA.altura / 2, 0);
  });

  it('numa janela menor que o popup o tamanho encolhe e o popup continua dentro dela', () => {
    const pequena = { largura: 500, altura: 600 };
    const r = ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, pequena);
    expect(r.esquerda).toBeGreaterThanOrEqual(MARGEM_DA_JANELA_PX);
    expect(r.esquerda + r.largura).toBeLessThanOrEqual(pequena.largura - MARGEM_DA_JANELA_PX);
    expect(r.topo).toBeGreaterThanOrEqual(MARGEM_DA_JANELA_PX);
    expect(r.topo + r.altura).toBeLessThanOrEqual(pequena.altura - MARGEM_DA_JANELA_PX);
    expect(r.altura).toBe(pequena.altura - 2 * MARGEM_DA_JANELA_PX);
  });
});

describe('posicao-popup.util — limites e movimento', () => {
  it('o tamanho tem mínimo 360×480 e máximo a janela menos a margem', () => {
    expect(limitarTamanho({ largura: 100, altura: 100 }, JANELA)).toEqual(TAMANHO_MINIMO_DO_POPUP);
    expect(limitarTamanho({ largura: 5000, altura: 5000 }, JANELA)).toEqual({ largura: JANELA.largura - 32, altura: JANELA.altura - 32 });
  });

  it('numa janela menor que o mínimo, a janela vence (o popup nunca passa dela)', () => {
    expect(limitarTamanho({ largura: 392, altura: 640 }, { largura: 300, altura: 400 })).toEqual({ largura: 268, altura: 368 });
  });

  it('mover nunca leva o popup para fora da janela', () => {
    const inicial = { esquerda: 500, topo: 100, largura: 392, altura: 640 };
    expect(moverPopup(inicial, -10_000, -10_000, JANELA)).toMatchObject({ esquerda: MARGEM_DA_JANELA_PX, topo: MARGEM_DA_JANELA_PX });
    const fim = moverPopup(inicial, 10_000, 10_000, JANELA);
    expect(fim.esquerda).toBe(JANELA.largura - 392 - MARGEM_DA_JANELA_PX);
    expect(fim.topo).toBe(JANELA.altura - 640 - MARGEM_DA_JANELA_PX);
    expect(moverPopup(inicial, 10, -20, JANELA)).toMatchObject({ esquerda: 510, topo: 80 });
  });

  it('limitar puxa um popup que ficou para fora (janela reduzida)', () => {
    const r = limitarPopup({ esquerda: 1200, topo: 700, largura: 392, altura: 640 }, { largura: 800, altura: 700 });
    expect(r.esquerda + r.largura).toBeLessThanOrEqual(800 - MARGEM_DA_JANELA_PX);
    expect(r.topo + r.altura).toBeLessThanOrEqual(700 - MARGEM_DA_JANELA_PX);
  });
});

describe('posicao-popup.util — alça de redimensionar', () => {
  it('a alça fica no canto oposto ao canto da tela mais próximo', () => {
    const embaixoADireita = ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    expect(cantoDaAncora(embaixoADireita, JANELA)).toBe('INFERIOR_DIREITO');
    expect(cantoDaAlca(embaixoADireita, JANELA)).toBe('SUPERIOR_ESQUERDO');
    const emCimaAEsquerda = ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    expect(cantoDaAlca(emCimaAEsquerda, JANELA)).toBe('INFERIOR_DIREITO');
    expect(cantoDaAlca(ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA), JANELA)).toBe('INFERIOR_ESQUERDO');
    expect(cantoDaAlca(ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, JANELA), JANELA)).toBe('SUPERIOR_DIREITO');
  });

  it('puxar a alça do canto superior esquerdo cresce para a esquerda e para cima, com o canto inferior direito parado', () => {
    const inicial = ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    const r = redimensionarPopup(inicial, 'SUPERIOR_ESQUERDO', -100, -50, JANELA);
    expect(r.largura).toBe(inicial.largura + 100);
    expect(r.altura).toBe(inicial.altura + 50);
    expect(r.esquerda + r.largura).toBe(inicial.esquerda + inicial.largura);
    expect(r.topo + r.altura).toBe(inicial.topo + inicial.altura);
  });

  it('puxar a alça do canto inferior direito cresce para a direita e para baixo, com o canto superior esquerdo parado', () => {
    const inicial = ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    const r = redimensionarPopup(inicial, 'INFERIOR_DIREITO', 40, 30, JANELA);
    expect(r).toEqual({ ...inicial, largura: inicial.largura + 40, altura: inicial.altura + 30 });
  });

  it('nunca fica abaixo de 360×480 nem passa da margem da janela', () => {
    const inicial = ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, JANELA);
    const menor = redimensionarPopup(inicial, 'SUPERIOR_ESQUERDO', 5000, 5000, JANELA);
    expect([menor.largura, menor.altura]).toEqual([TAMANHO_MINIMO_DO_POPUP.largura, TAMANHO_MINIMO_DO_POPUP.altura]);
    expect(menor.esquerda + menor.largura).toBe(inicial.esquerda + inicial.largura);

    const maior = redimensionarPopup(inicial, 'SUPERIOR_ESQUERDO', -5000, -5000, JANELA);
    expect(maior.esquerda).toBe(MARGEM_DA_JANELA_PX);
    expect(maior.topo).toBe(MARGEM_DA_JANELA_PX);
  });
});

describe('posicao-popup.util — arranjo guardado', () => {
  it('a chave é por usuário e versionada', () => {
    expect(chaveDoArranjo(7)).toBe('project20:chat-popup:v1:7');
    expect(chaveDoArranjo(7)).not.toBe(chaveDoArranjo(8));
  });

  it('o que foi guardado volta igual, já limitado à janela de agora', () => {
    const r = { esquerda: 100, topo: 80, largura: 400, altura: 500 };
    expect(lerArranjo(serializarArranjo(r), JANELA)).toEqual(r);
    const emJanelaMenor = lerArranjo(serializarArranjo({ ...r, esquerda: 1200 }), { largura: 800, altura: 700 })!;
    expect(emJanelaMenor.esquerda + emJanelaMenor.largura).toBeLessThanOrEqual(800 - MARGEM_DA_JANELA_PX);
  });

  it('texto ausente, corrompido ou com número inválido vale "sem arranjo"', () => {
    for (const texto of [null, undefined, '', 'lixo', '[]', 'null', '{"esquerda":1}', '{"esquerda":"a","topo":1,"largura":400,"altura":500}', '{"esquerda":1,"topo":1,"largura":null,"altura":500}']) {
      expect(lerArranjo(texto as string | null | undefined, JANELA), String(texto)).toBeNull();
    }
  });
});
