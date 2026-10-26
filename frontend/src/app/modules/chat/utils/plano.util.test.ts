import { describe, it, expect } from 'vitest';
import { LARGURA_DO_DOCUMENTO, larguraDoDocumentoPeloPonteiro, limitarLarguraDoDocumento } from './plano.util';

describe('largura do documento do plano', () => {
  it('mantém o valor entre o mínimo e o máximo', () => {
    expect(limitarLarguraDoDocumento(50)).toBe(50);
    expect(limitarLarguraDoDocumento(5)).toBe(LARGURA_DO_DOCUMENTO.minima);
    expect(limitarLarguraDoDocumento(95)).toBe(LARGURA_DO_DOCUMENTO.maxima);
  });

  it('valor ilegível volta ao padrão', () => {
    expect(limitarLarguraDoDocumento(Number.NaN)).toBe(LARGURA_DO_DOCUMENTO.padrao);
    expect(limitarLarguraDoDocumento(Number.POSITIVE_INFINITY)).toBe(LARGURA_DO_DOCUMENTO.padrao);
  });

  it('o ponteiro no meio da área dá metade; mais à esquerda, mais documento', () => {
    expect(larguraDoDocumentoPeloPonteiro(600, 200, 800)).toBe(50);
    expect(larguraDoDocumentoPeloPonteiro(400, 200, 800)).toBe(LARGURA_DO_DOCUMENTO.maxima);
    expect(larguraDoDocumentoPeloPonteiro(900, 200, 800)).toBe(LARGURA_DO_DOCUMENTO.minima);
  });

  it('área sem largura devolve o padrão', () => {
    expect(larguraDoDocumentoPeloPonteiro(100, 0, 0)).toBe(LARGURA_DO_DOCUMENTO.padrao);
  });
});
