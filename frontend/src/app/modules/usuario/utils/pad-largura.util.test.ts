import { describe, expect, it } from 'vitest';
import { LARGURA_DO_PAD, larguraDoPadPeloPonteiro, larguraMaximaDoPad, limitarLarguraDoPad } from './pad-largura.util';

describe('largura do drawer do pad', () => {
  it('a máxima é a janela menos 120 px, e nunca fica abaixo da mínima', () => {
    expect(larguraMaximaDoPad(1920)).toBe(1800);
    expect(larguraMaximaDoPad(1366)).toBe(1246);
    expect(larguraMaximaDoPad(400)).toBe(LARGURA_DO_PAD.minima);
  });

  it('limita entre 380 px e a máxima da janela', () => {
    expect(limitarLarguraDoPad(100, 1366)).toBe(380);
    expect(limitarLarguraDoPad(600, 1366)).toBe(600);
    expect(limitarLarguraDoPad(5000, 1366)).toBe(1246);
  });

  it('valor ilegível volta ao padrão de 520 px (ou ao máximo, em janela pequena)', () => {
    expect(limitarLarguraDoPad(Number.NaN, 1366)).toBe(520);
    expect(limitarLarguraDoPad(Number.NaN, 500)).toBe(380);
  });

  it('pelo ponteiro: o drawer ocupa o que sobra à direita dele', () => {
    expect(larguraDoPadPeloPonteiro(1000, 1366)).toBe(380);
    expect(larguraDoPadPeloPonteiro(700, 1366)).toBe(666);
    expect(larguraDoPadPeloPonteiro(10, 1366)).toBe(1246);
  });
});
