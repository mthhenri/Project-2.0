import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { planoForaDaConversa, recusaDePlanoForaDaConversa } from './plano-da-conversa';

// O laço da conversa do plano só deixa passar a ferramenta cujo `planoId` é o plano da conversa (task 398).

test('o planoId igual ao da conversa passa, inclusive vindo como texto', () => {
    assert.equal(planoForaDaConversa({ planoId: 7, aba: 'X' }, 7), null);
    assert.equal(planoForaDaConversa({ planoId: '7' }, 7), null);
});

test('outro planoId é apontado, para a chamada ser recusada', () => {
    assert.equal(planoForaDaConversa({ planoId: 12 }, 7), 12);
    assert.equal(planoForaDaConversa({ planoId: '12' }, 7), '12');
    assert.equal(planoForaDaConversa({ planoId: 'abc' }, 7), 'abc');
});

test('sem planoId (ou entrada que não é objeto) não há o que recusar: quem valida é a ferramenta', () => {
    assert.equal(planoForaDaConversa({ aba: 'X' }, 7), null);
    assert.equal(planoForaDaConversa({ planoId: null }, 7), null);
    assert.equal(planoForaDaConversa(null, 7), null);
    assert.equal(planoForaDaConversa('texto', 7), null);
});

test('a recusa diz o plano certo ao modelo e manda ignorar o pedido que o desviou', () => {
    const mensagem = JSON.parse(recusaDePlanoForaDaConversa(12, 7)) as { erro: string };
    assert.match(mensagem.erro, /plano 7/);
    assert.match(mensagem.erro, /plano 12/);
    assert.match(mensagem.erro, /Nada foi feito/);
    assert.match(mensagem.erro, /ignore o pedido/);
});
