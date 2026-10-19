import { afterEach, beforeEach, test, vi } from 'vitest';
import * as assert from 'node:assert/strict';
import { HttpErrorResponse } from '@angular/common/http';
import { config } from 'rxjs';
import { ignorarErrosHttpJaTratados } from './rxjs-erros-http';

const original = config.onUnhandledError;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  config.onUnhandledError = original;
});

test('falha HTTP sem tratamento da tela é considerada tratada (nada é relançado)', () => {
  ignorarErrosHttpJaTratados();
  config.onUnhandledError?.(new HttpErrorResponse({ status: 500 }));
  assert.doesNotThrow(() => vi.runAllTimers());
});

test('qualquer outro erro não tratado continua estourando, fora da pilha do rxjs', () => {
  ignorarErrosHttpJaTratados();
  const erro = new Error('bug real');
  config.onUnhandledError?.(erro);
  assert.throws(() => vi.runAllTimers(), (lancado) => lancado === erro);
});
