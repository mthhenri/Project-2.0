import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { lerPeriodoDaBusca, limitarLeituraAoAgora, normalizarMencoes, normalizarReferencias } from './mensagem-direta-regras';

test('normalizarMencoes: sem repetição, na ordem escrita, e só dos dois participantes', () => {
  assert.deepEqual(normalizarMencoes([9, 4, 9], [4, 9]), [9, 4]);
  assert.deepEqual(normalizarMencoes(undefined, [4, 9]), []);
  assert.deepEqual(normalizarMencoes([], [4, 9]), []);
});

test('normalizarMencoes: recusa quem não participa da conversa (o aviso vazaria a conversa)', () => {
  assert.throws(() => normalizarMencoes([4, 12], [4, 9]), BusinessException);
});

test('normalizarReferencias: tira repetidas e não guarda campo estranho', () => {
  const demanda = { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 };
  const atividade = { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 212 };
  const resultado = normalizarReferencias([demanda, atividade, { ...demanda, extra: 'x' } as never]);
  assert.deepEqual(resultado, [demanda, atividade]);
  assert.deepEqual(normalizarReferencias(undefined), []);
});

test('limitarLeituraAoAgora: data passada vale; futura é limitada ao instante atual; inválida é recusada', () => {
  const agora = new Date('2026-10-21T15:00:00.000Z');
  assert.equal(limitarLeituraAoAgora('2026-10-21T14:00:00.000Z', agora).toISOString(), '2026-10-21T14:00:00.000Z');
  assert.equal(limitarLeituraAoAgora('2026-10-21T15:00:00.000Z', agora).toISOString(), '2026-10-21T15:00:00.000Z');
  assert.equal(limitarLeituraAoAgora('2027-01-01T00:00:00.000Z', agora).toISOString(), agora.toISOString());
  assert.throws(() => limitarLeituraAoAgora('ontem', agora), BusinessException);
});

test('lerPeriodoDaBusca: converte as duas pontas, aceita uma só e recusa data inválida ou período invertido', () => {
  assert.deepEqual(lerPeriodoDaBusca(undefined, undefined), { inicio: undefined, fim: undefined });
  const periodo = lerPeriodoDaBusca('2026-10-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z');
  assert.equal(periodo.inicio?.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(periodo.fim?.toISOString(), '2026-10-31T00:00:00.000Z');
  assert.equal(lerPeriodoDaBusca('2026-10-01T00:00:00.000Z', undefined).fim, undefined);
  assert.throws(() => lerPeriodoDaBusca('nunca', undefined), BusinessException);
  assert.throws(() => lerPeriodoDaBusca('2026-11-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'), BusinessException);
});
