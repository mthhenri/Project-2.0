import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { registrarToque } from './toques-rapidos.util';

function tocar(instantes: number[]): boolean[] {
    let toques: number[] = [];
    return instantes.map((agora) => {
        const resultado = registrarToque(toques, agora);
        toques = resultado.toques;
        return resultado.completou;
    });
}

test('cinco toques em menos de 2 s completam no quinto', () => {
    assert.deepEqual(tocar([0, 300, 600, 900, 1200]), [false, false, false, false, true]);
});

test('quatro toques não completam', () => {
    assert.deepEqual(tocar([0, 100, 200, 300]), [false, false, false, false]);
});

test('o quinto exatamente aos 2 s do primeiro não completa: a janela é menor que 2 s', () => {
    assert.deepEqual(tocar([0, 500, 1000, 1500, 2000]), [false, false, false, false, false]);
});

test('toques espaçados saem da janela: cinco toques ao longo de 3,6 s não completam', () => {
    assert.deepEqual(tocar([0, 900, 1800, 2700, 3600]), [false, false, false, false, false]);
});

test('uma pausa longa zera a contagem: depois dela são precisos cinco toques de novo', () => {
    assert.deepEqual(tocar([0, 100, 200, 5000, 5100, 5200, 5300, 5400]), [false, false, false, false, false, false, false, true]);
});

test('depois de completar, o sexto toque começa uma contagem nova', () => {
    assert.deepEqual(tocar([0, 100, 200, 300, 400, 500, 600, 700, 800, 900]), [false, false, false, false, true, false, false, false, false, true]);
});
