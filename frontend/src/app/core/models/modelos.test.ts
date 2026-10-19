import { beforeEach, test } from 'vitest';
import * as assert from 'node:assert/strict';
import { HORAS_POR_DIA, formatarTempoExibicao } from './visualizacao-tempo.model';
import {
  COR_CHAVE_COR,
  COR_CHAVE_DESBLOQUEADO,
  PALETA_PRIMARIA_PADRAO,
  normalizarHex,
  resolverPaletaPrimariaInicial,
} from './tema-personalizado.model';

beforeEach(() => localStorage.clear());

test('um dia de trabalho tem 8 horas', () => {
  assert.equal(HORAS_POR_DIA, 8);
});

test('minutos exibidos em dias arredondam para 2 casas', () => {
  assert.equal(formatarTempoExibicao(1, true, 'minutos'), '0 dias');
  assert.equal(formatarTempoExibicao(720, true, 'minutos'), '1,5 dias');
});

test('normalizarHex acrescenta # só quando falta', () => {
  assert.equal(normalizarHex('10b981'), '#10b981');
  assert.equal(normalizarHex('#10b981'), '#10b981');
});

test('sem preferência salva, a paleta inicial é a azul padrão', () => {
  assert.deepEqual(resolverPaletaPrimariaInicial(), { ...PALETA_PRIMARIA_PADRAO });
});

test('cor salva mas não desbloqueada é ignorada', () => {
  localStorage.setItem(COR_CHAVE_COR, '#10b981');
  assert.deepEqual(resolverPaletaPrimariaInicial(), { ...PALETA_PRIMARIA_PADRAO });
});

test('desbloqueado sem cor salva cai no padrão', () => {
  localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
  assert.deepEqual(resolverPaletaPrimariaInicial(), { ...PALETA_PRIMARIA_PADRAO });
});

test('desbloqueado com cor salva gera a escala 50-950 a partir dela (aceita hex sem #)', () => {
  localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
  localStorage.setItem(COR_CHAVE_COR, '10b981');
  const paleta = resolverPaletaPrimariaInicial() as Record<string, string>;
  assert.deepEqual(Object.keys(paleta), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);
  assert.notEqual(paleta['500'], PALETA_PRIMARIA_PADRAO[500]);
  assert.match(paleta['500'], /^#[0-9a-f]{6}$/i);
});
