import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { DURACOES_REGISTRO, intervaloDaManha, intervaloRetroativo, minutosDoIntervalo } from './intervalo-registro.util';

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

  it('minutosDoIntervalo devolve a duração do intervalo, para destacar o atalho aplicado', () => {
    assert.equal(minutosDoIntervalo(intervaloRetroativo(agora, 90)), 90);
    assert.equal(minutosDoIntervalo(intervaloDaManha(agora)), 180);
  });

  it('cada atalho de duração do dialog gera um intervalo com exatamente os seus minutos', () => {
    assert.deepEqual(DURACOES_REGISTRO.map((duracao) => duracao.minutos), [30, 60, 120, 240]);
    for (const duracao of DURACOES_REGISTRO) {
      assert.equal(minutosDoIntervalo(intervaloRetroativo(agora, duracao.minutos)), duracao.minutos);
    }
  });
});
