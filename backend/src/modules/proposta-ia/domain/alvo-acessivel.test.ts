import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { alvoAcessivel, idDoAlvo } from './alvo-acessivel';

test('alvoAcessivel: verdadeiro só quando todas as leituras dão certo', async () => {
    assert.equal(await alvoAcessivel(async () => ({}), async () => ({})), true);
    assert.equal(await alvoAcessivel(async () => ({}), async () => { throw new ResourceNotFoundException('Demanda'); }), false);
    assert.equal(await alvoAcessivel(async () => { throw new Error('banco fora do ar'); }), false, 'qualquer falha esconde');
});

test('idDoAlvo: inteiro positivo, senão nulo', () => {
    assert.equal(idDoAlvo({ demandaId: 12 }, 'demandaId'), 12);
    assert.equal(idDoAlvo({ demandaId: '12' }, 'demandaId'), 12);
    assert.equal(idDoAlvo({}, 'demandaId'), null);
    assert.equal(idDoAlvo({ demandaId: 0 }, 'demandaId'), null);
    assert.equal(idDoAlvo({ demandaId: 1.5 }, 'demandaId'), null);
});
