import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { segundosAteOCorte } from './validade-do-token';

const SEGUNDA_SEIS = { diaDaSemana: 1, hora: 6, minuto: 0 };
const SAO_PAULO = 'America/Sao_Paulo';

/** O instante em que um token emitido em `agora` vence. */
function venceEm(agora: string, fusoHorario = SAO_PAULO, corte = SEGUNDA_SEIS): string {
    const emitido = new Date(agora);
    return new Date(emitido.getTime() + segundosAteOCorte(emitido, corte, fusoHorario) * 1000).toISOString();
}

test('qualquer login da semana vence na próxima segunda às 6h de São Paulo', () => {
    // 2026-11-30 é segunda; 06:00 em São Paulo = 09:00 UTC.
    for (const agora of ['2026-11-30T11:00:00Z', '2026-12-01T12:00:00Z', '2026-12-04T21:00:00Z', '2026-12-07T02:00:00Z']) {
        assert.equal(venceEm(agora), '2026-12-07T09:00:00.000Z', agora);
    }
});

test('na segunda antes das 6h vence no mesmo dia; no instante do corte, só na semana seguinte', () => {
    assert.equal(venceEm('2026-11-30T08:59:00Z'), '2026-11-30T09:00:00.000Z');
    assert.equal(venceEm('2026-11-30T09:00:00Z'), '2026-12-07T09:00:00.000Z');
});

test('o dia da semana é o do fuso, não o do UTC', () => {
    // Domingo 23h em São Paulo já é segunda 02h em UTC.
    assert.equal(venceEm('2026-11-30T02:00:00Z'), '2026-11-30T09:00:00.000Z');
});

test('com horário de verão o corte continua na hora local pedida', () => {
    // Nova York volta uma hora em 2026-11-01: 06:00 local passa a ser 11:00 UTC.
    assert.equal(venceEm('2026-10-30T12:00:00Z', 'America/New_York'), '2026-11-02T11:00:00.000Z');
});

test('a validade é um número inteiro de segundos, mesmo com milissegundos no instante', () => {
    const segundos = segundosAteOCorte(new Date('2026-11-30T08:59:59.700Z'), SEGUNDA_SEIS, SAO_PAULO);
    assert.equal(segundos, 1);
});
