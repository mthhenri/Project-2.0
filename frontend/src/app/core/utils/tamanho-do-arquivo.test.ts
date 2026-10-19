import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { formatarTamanhoDoArquivo } from './tamanho-do-arquivo';

test('formata em B, KB, MB e GB com vírgula e uma casa', () => {
  assert.equal(formatarTamanhoDoArquivo(0), '0 B');
  assert.equal(formatarTamanhoDoArquivo(512), '512 B');
  assert.equal(formatarTamanhoDoArquivo(1024), '1,0 KB');
  assert.equal(formatarTamanhoDoArquivo(87_654_321), '83,6 MB');
  assert.equal(formatarTamanhoDoArquivo(3 * 1024 ** 3), '3,0 GB');
});

test('valor inválido não quebra', () => {
  assert.equal(formatarTamanhoDoArquivo(Number.NaN), '0 B');
  assert.equal(formatarTamanhoDoArquivo(-5), '0 B');
});
