import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { intervaloDaManha, intervaloRetroativo, minutosDoIntervalo } from './intervalo-registro.util';

describe('intervalo-registro.util', () => {
  const agora = new Date(2026, 9, 18, 14, 37, 42, 500);

  it('retroativo termina no minuto atual e volta a duração pedida', () => {
    const intervalo = intervaloRetroativo(agora, 120);
    assert.equal(intervalo.fimData.getHours(), 14);
    assert.equal(intervalo.fimData.getMinutes(), 37);
    assert.equal(intervalo.fimData.getSeconds(), 0);
    assert.equal(intervalo.inicioData.getHours(), 12);
    assert.equal(intervalo.inicioData.getMinutes(), 37);
  });

  it('retroativo atravessa a meia-noite sem quebrar', () => {
    const intervalo = intervaloRetroativo(new Date(2026, 9, 18, 0, 10), 30);
    assert.equal(intervalo.inicioData.getDate(), 17);
    assert.equal(intervalo.inicioData.getHours(), 23);
    assert.equal(intervalo.inicioData.getMinutes(), 40);
  });

  it('manhã vai de 09:00 a 12:00 de hoje', () => {
    const intervalo = intervaloDaManha(agora);
    assert.equal(intervalo.inicioData.getHours(), 9);
    assert.equal(intervalo.fimData.getHours(), 12);
    assert.equal(intervalo.inicioData.getDate(), 18);
    assert.equal(minutosDoIntervalo(intervalo), 180);
  });

  it('minutosDoIntervalo devolve null sem intervalo', () => {
    assert.equal(minutosDoIntervalo(null), null);
  });
});
