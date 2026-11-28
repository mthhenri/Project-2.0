import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { lerCorteSemanal } from './corte-semanal';

test('JWT_CORTE_SEMANAL ausente ou vazia desliga o corte', () => {
    assert.equal(lerCorteSemanal(undefined), undefined);
    assert.equal(lerCorteSemanal('   '), undefined);
});

test('lê o dia (domingo = 0), a hora e o minuto, sem depender de maiúsculas', () => {
    assert.deepEqual(lerCorteSemanal('SEGUNDA 06:00'), { diaDaSemana: 1, hora: 6, minuto: 0 });
    assert.deepEqual(lerCorteSemanal(' domingo 23:59 '), { diaDaSemana: 0, hora: 23, minuto: 59 });
    assert.deepEqual(lerCorteSemanal('Sabado 0:30'), { diaDaSemana: 6, hora: 0, minuto: 30 });
});

test('valor inválido derruba a subida citando a variável', () => {
    for (const valor of ['SEGUNDA', 'FERIADO 06:00', 'SEGUNDA 24:00', 'SEGUNDA 06:60', '06:00', 'SEGUNDA 6h']) {
        assert.throws(() => lerCorteSemanal(valor), /JWT_CORTE_SEMANAL/, valor);
    }
});
