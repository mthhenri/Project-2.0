import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { descartarAssinaturas } from './ia-mensagens';
import { IaMensagem } from './ia.tipos';

test('descartarAssinaturas tira a assinatura das chamadas de ferramenta e mantém todo o resto', () => {
    const mensagens: IaMensagem[] = [
        { papel: 'usuario', conteudo: 'oi' },
        {
            papel: 'ia',
            conteudo: [
                { tipo: 'texto', texto: 'vou ver' },
                { tipo: 'uso_ferramenta', id: 'a', nome: 'ferramenta', entrada: { x: 1 }, assinatura: 'SEGREDO' },
                { tipo: 'uso_ferramenta', id: 'b', nome: 'outra', entrada: {} },
            ],
        },
        { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'a', conteudo: 'ok' }] },
    ];
    const limpas = descartarAssinaturas(mensagens);

    assert.deepEqual(limpas[1].conteudo, [
        { tipo: 'texto', texto: 'vou ver' },
        { tipo: 'uso_ferramenta', id: 'a', nome: 'ferramenta', entrada: { x: 1 } },
        { tipo: 'uso_ferramenta', id: 'b', nome: 'outra', entrada: {} },
    ]);
    assert.equal('assinatura' in (limpas[1].conteudo as object[])[1], false);
    assert.deepEqual([limpas[0], limpas[2]], [mensagens[0], mensagens[2]]);
});

test('descartarAssinaturas não altera o histórico recebido', () => {
    const mensagens: IaMensagem[] = [{ papel: 'ia', conteudo: [{ tipo: 'uso_ferramenta', id: 'a', nome: 'f', entrada: {}, assinatura: 'SEGREDO' }] }];
    descartarAssinaturas(mensagens);
    assert.equal((mensagens[0].conteudo as Array<{ assinatura?: string }>)[0].assinatura, 'SEGREDO');
});

test('sem nenhuma assinatura, devolve as próprias mensagens (nada a copiar)', () => {
    const mensagens: IaMensagem[] = [{ papel: 'usuario', conteudo: 'oi' }];
    assert.equal(descartarAssinaturas(mensagens), mensagens);
});
