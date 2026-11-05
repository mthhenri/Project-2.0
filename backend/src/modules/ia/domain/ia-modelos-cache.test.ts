import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CacheEmMemoria, comTempoLimite, TEMPO_DO_CACHE_DOS_MODELOS_MS } from './ia-modelos-cache';

test('o tempo do cache é de 30 minutos (constante nomeada)', () => {
    assert.equal(TEMPO_DO_CACHE_DOS_MODELOS_MS, 30 * 60 * 1000);
});

test('o cache evita nova busca dentro da validade e busca de novo quando expira', async () => {
    let agora = 1_000;
    let buscas = 0;
    const cache = new CacheEmMemoria<string>(500, () => agora);
    const buscar = async () => `valor-${++buscas}`;

    assert.equal(await cache.obter('a', buscar), 'valor-1');
    agora += 499;
    assert.equal(await cache.obter('a', buscar), 'valor-1', 'ainda vale');
    agora += 2;
    assert.equal(await cache.obter('a', buscar), 'valor-2', 'expirou');
    assert.equal(buscas, 2);
});

test('cada chave tem o seu cache', async () => {
    const cache = new CacheEmMemoria<string>(500, () => 0);
    assert.equal(await cache.obter('a', async () => 'um'), 'um');
    assert.equal(await cache.obter('b', async () => 'dois'), 'dois');
    assert.equal(await cache.obter('a', async () => 'outro'), 'um');
});

test('falha não é guardada: a próxima chamada tenta de novo', async () => {
    const cache = new CacheEmMemoria<string>(500, () => 0);
    await assert.rejects(() => cache.obter('a', async () => { throw new Error('caiu'); }), /caiu/);
    assert.equal(await cache.obter('a', async () => 'voltou'), 'voltou');
});

test('chamadas simultâneas à mesma chave compartilham uma só busca', async () => {
    const cache = new CacheEmMemoria<string>(500, () => 0);
    let buscas = 0;
    let liberar!: (valor: string) => void;
    const buscar = () => { buscas++; return new Promise<string>((resolver) => { liberar = resolver; }); };

    const primeira = cache.obter('a', buscar);
    const segunda = cache.obter('a', buscar);
    liberar('pronto');
    assert.deepEqual(await Promise.all([primeira, segunda]), ['pronto', 'pronto']);
    assert.equal(buscas, 1);
});

test('busca simultânea que falha falha para todos e a seguinte tenta de novo', async () => {
    const cache = new CacheEmMemoria<string>(500, () => 0);
    let rejeitar!: (erro: Error) => void;
    const falhando = () => new Promise<string>((_, recusar) => { rejeitar = recusar; });
    const primeira = cache.obter('a', falhando);
    const segunda = cache.obter('a', falhando);
    rejeitar(new Error('caiu'));
    await assert.rejects(() => primeira, /caiu/);
    await assert.rejects(() => segunda, /caiu/);
    assert.equal(await cache.obter('a', async () => 'ok'), 'ok');
});

test('comTempoLimite devolve o resultado que chega a tempo e falha o que passa do limite', async () => {
    assert.equal(await comTempoLimite(Promise.resolve('rápido'), 50), 'rápido');
    await assert.rejects(() => comTempoLimite(new Promise<string>(() => undefined), 20), /passou de 20 ms/);
    await assert.rejects(() => comTempoLimite(Promise.reject(new Error('erro do SDK')), 50), /erro do SDK/);
});
