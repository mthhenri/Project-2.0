import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { deveRenovarRegistro, LIMITE_DO_REGISTRO_BYTES, linhaDoRegistro } from './registro';

const DATA = new Date('2026-11-03T12:00:00.000Z');

test('a linha leva a data ISO, o evento e os detalhes em JSON, terminando em quebra de linha', () => {
    assert.equal(linhaDoRegistro(DATA, 'chat:sem-pintura', { tentativa: 1 }), '2026-11-03T12:00:00.000Z chat:sem-pintura {"tentativa":1}\n');
    assert.equal(linhaDoRegistro(DATA, 'app:iniciado'), '2026-11-03T12:00:00.000Z app:iniciado {}\n');
});

test('a linha nunca quebra nem cresce sem limite', () => {
    const linha = linhaDoRegistro(DATA, 'janela:falhou', { motivo: 'primeira\r\nsegunda', longo: 'x'.repeat(2000) });
    assert.equal(linha.split('\n').length, 2);
    assert.ok(linha.length < 600);
});

test('detalhes que não viram JSON não derrubam o registro', () => {
    const circular: Record<string, unknown> = {};
    circular['proprio'] = circular;
    assert.match(linhaDoRegistro(DATA, 'x', circular), /detalhes ilegíveis/);
});

test('renova o arquivo ao chegar ao limite', () => {
    assert.equal(deveRenovarRegistro(0), false);
    assert.equal(deveRenovarRegistro(LIMITE_DO_REGISTRO_BYTES - 1), false);
    assert.equal(deveRenovarRegistro(LIMITE_DO_REGISTRO_BYTES), true);
});
