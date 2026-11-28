import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { preencherSegredos } from './preparar-env-producao.mjs';

test('gera um valor diferente para cada segredo vazio do modelo e não mexe no resto', () => {
    let numero = 0;
    const resultado = preencherSegredos('DB_NOME=project20\r\nDB_SENHA=\r\nJWT_SECRETO=\r\nOPENAI_API_KEY=\r\n', () => `segredo${++numero}`);
    assert.match(resultado, /^DB_SENHA=segredo1\r?$/m);
    assert.match(resultado, /^JWT_SECRETO=segredo2\r?$/m);
    assert.match(resultado, /^DB_NOME=project20\r?$/m);
    assert.match(resultado, /^OPENAI_API_KEY=\r?$/m);
});

test('segredo já preenchido não é trocado', () => {
    assert.equal(preencherSegredos('DB_SENHA=minha\n', () => 'outro'), 'DB_SENHA=minha\n');
});

test('o modelo da produção sai com os dois segredos preenchidos', () => {
    const modelo = readFileSync(new URL('../infra/producao/.env.example', import.meta.url), 'utf8');
    const resultado = preencherSegredos(modelo, () => 'x');
    assert.match(resultado, /^DB_SENHA=x\r?$/m);
    assert.match(resultado, /^JWT_SECRETO=x\r?$/m);
});
