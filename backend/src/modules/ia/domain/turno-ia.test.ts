import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum } from '@project20/shared';
import { executarNoTurno, nivelMaisAlto, turnoAtual, TurnoIa } from './turno-ia';

const chamada = (nivel: NivelIaEnum, modelo: string, entrada = 1) => ({ nivel, modelo, tokens: { entrada, saida: 2, cache: 3 } });
const espera = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

describe('nível mais alto do turno (task 188)', () => {
  it('segue a ordem RAPIDO < PADRAO < ANALITICO, em qualquer ordem dos dois', () => {
    assert.equal(nivelMaisAlto(NivelIaEnum.RAPIDO, NivelIaEnum.PADRAO), NivelIaEnum.PADRAO);
    assert.equal(nivelMaisAlto(NivelIaEnum.PADRAO, NivelIaEnum.RAPIDO), NivelIaEnum.PADRAO);
    assert.equal(nivelMaisAlto(NivelIaEnum.ANALITICO, NivelIaEnum.PADRAO), NivelIaEnum.ANALITICO);
    assert.equal(nivelMaisAlto(NivelIaEnum.PADRAO, NivelIaEnum.ANALITICO), NivelIaEnum.ANALITICO);
    assert.equal(nivelMaisAlto(NivelIaEnum.RAPIDO, NivelIaEnum.RAPIDO), NivelIaEnum.RAPIDO);
  });
});

describe('TurnoIa', () => {
  it('sem nenhuma chamada: RAPIDO, sem modelo e tokens zerados', () => {
    const turno = new TurnoIa();
    assert.deepEqual([turno.nivel, turno.modelo, turno.tokens], [NivelIaEnum.RAPIDO, null, { entrada: 0, saida: 0, cache: 0 }]);
  });

  it('guarda o maior nível, o modelo da última chamada desse nível e soma os tokens', () => {
    const turno = new TurnoIa();
    turno.registrar(chamada(NivelIaEnum.RAPIDO, 'haiku', 10));
    turno.registrar(chamada(NivelIaEnum.ANALITICO, 'opus-1', 100));
    turno.registrar(chamada(NivelIaEnum.PADRAO, 'sonnet', 5));
    turno.registrar(chamada(NivelIaEnum.ANALITICO, 'opus-2', 1));
    assert.deepEqual([turno.nivel, turno.modelo], [NivelIaEnum.ANALITICO, 'opus-2']);
    assert.deepEqual(turno.tokens, { entrada: 116, saida: 8, cache: 12 });
  });

  it('o primeiro registro define o modelo mesmo sendo o mais baixo', () => {
    const turno = new TurnoIa();
    turno.registrar(chamada(NivelIaEnum.RAPIDO, 'haiku'));
    assert.deepEqual([turno.nivel, turno.modelo], [NivelIaEnum.RAPIDO, 'haiku']);
  });

  it('os tokens devolvidos são uma cópia: mexer neles não altera o turno', () => {
    const turno = new TurnoIa();
    turno.registrar(chamada(NivelIaEnum.RAPIDO, 'haiku', 4));
    turno.tokens.entrada = 999;
    assert.equal(turno.tokens.entrada, 4);
  });
});

describe('turno aberto no fluxo assíncrono', () => {
  it('fora de um turno não há turno atual', () => {
    assert.equal(turnoAtual(), undefined);
  });

  it('dentro do turno ele é visto por tudo o que o trabalho espera, e some ao terminar', async () => {
    const turno = new TurnoIa();
    const visto = await executarNoTurno(turno, async () => {
      await espera(1);
      return turnoAtual();
    });
    assert.equal(visto, turno);
    assert.equal(turnoAtual(), undefined);
  });

  it('turnos simultâneos de usuários diferentes não se misturam', async () => {
    const primeiro = new TurnoIa();
    const segundo = new TurnoIa();
    await Promise.all([
      executarNoTurno(primeiro, async () => {
        await espera(8);
        turnoAtual()?.registrar(chamada(NivelIaEnum.ANALITICO, 'opus', 100));
      }),
      executarNoTurno(segundo, async () => {
        await espera(2);
        turnoAtual()?.registrar(chamada(NivelIaEnum.RAPIDO, 'haiku', 1));
        await espera(12);
        turnoAtual()?.registrar(chamada(NivelIaEnum.RAPIDO, 'haiku', 1));
      }),
    ]);
    assert.deepEqual([primeiro.nivel, primeiro.tokens.entrada], [NivelIaEnum.ANALITICO, 100]);
    assert.deepEqual([segundo.nivel, segundo.tokens.entrada], [NivelIaEnum.RAPIDO, 2]);
  });
});
