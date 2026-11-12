import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
    listarNomes,
    normalizarEmojiDoGrupo,
    normalizarMencoesDoGrupo,
    normalizarNomeDoGrupo,
    normalizarNovosMembros,
    pontoDeLeituraDoGrupo,
    textoDeAparenciaDoGrupo,
    textoDeCriacaoDoGrupo,
    textoDeEntradaNoGrupo,
    textoDeGrupoPrivado,
    textoDeRenomeacaoDoGrupo,
    textoDeSaidaDoGrupo,
    textoDoAvisoDeSupervisaoDoGrupo,
} from './grupo-regras';

const recusa = (funcao: () => unknown, padrao: RegExp) =>
    assert.throws(funcao, (erro) => erro instanceof BusinessException && padrao.test(JSON.stringify(erro.getResponse())));

test('o nome do grupo perde as pontas e os espaços repetidos, é obrigatório e vai até 60 caracteres', () => {
    assert.equal(normalizarNomeDoGrupo('  Time   do\tbackend '), 'Time do backend');
    assert.equal(normalizarNomeDoGrupo('x'.repeat(60)).length, 60);
    recusa(() => normalizarNomeDoGrupo('   '), /precisa de um nome/);
    recusa(() => normalizarNomeDoGrupo(''), /precisa de um nome/);
    recusa(() => normalizarNomeDoGrupo('x'.repeat(61)), /no máximo 60/);
    assert.equal([...normalizarNomeDoGrupo('😀'.repeat(60))].length, 60, 'conta caracteres, não unidades UTF-16');
});

test('o emoji do grupo é opcional e, se vier, é um único emoji', () => {
    assert.equal(normalizarEmojiDoGrupo(undefined), null);
    assert.equal(normalizarEmojiDoGrupo(null), null);
    assert.equal(normalizarEmojiDoGrupo('   '), null);
    assert.equal(normalizarEmojiDoGrupo(' 🚀 '), '🚀');
    assert.equal(normalizarEmojiDoGrupo('👨‍👩‍👧'), '👨‍👩‍👧', 'sequência com junção conta como um emoji');
    recusa(() => normalizarEmojiDoGrupo('🚀🚀'), /único emoji/);
    recusa(() => normalizarEmojiDoGrupo('oi'), /único emoji/);
});

test('os novos membros saem sem repetição, sem quem pediu e sem quem já é membro; o limite de 50 conta todos', () => {
    assert.deepEqual(normalizarNovosMembros([5, 6, 5, 1, 2], [1, 2], 1), [5, 6]);
    assert.deepEqual(normalizarNovosMembros(undefined, [1], 1), []);
    const cinquenta = Array.from({ length: 49 }, (_, indice) => indice + 100);
    assert.deepEqual(normalizarNovosMembros([1000], [1, ...cinquenta.slice(0, 48)], 1), [1000], '50 pessoas cabem');
    recusa(() => normalizarNovosMembros([1000, 1001], [1, ...cinquenta.slice(0, 48)], 1), /no máximo 50/);
});

test('as menções do grupo só valem para membros e @todos expande nos membros menos o autor', () => {
    assert.deepEqual(normalizarMencoesDoGrupo([2, 2, 3], false, [1, 2, 3], 1), [2, 3]);
    assert.deepEqual(normalizarMencoesDoGrupo(undefined, false, [1, 2], 1), []);
    recusa(() => normalizarMencoesDoGrupo([9], false, [1, 2], 1), /membros do grupo/);
    assert.deepEqual(normalizarMencoesDoGrupo(undefined, true, [1, 2, 3], 2), [1, 3]);
    assert.deepEqual(normalizarMencoesDoGrupo([3], true, [1, 2, 3], 2), [3, 1]);
    recusa(() => normalizarMencoesDoGrupo([9], true, [1, 2], 1), /membros do grupo/);
});

test('os textos das mensagens do sistema dizem quem fez o quê', () => {
    assert.equal(listarNomes(['Ana']), 'Ana');
    assert.equal(listarNomes(['Ana', 'Bruno']), 'Ana e Bruno');
    assert.equal(listarNomes(['Ana', 'Bruno', 'Carla']), 'Ana, Bruno e Carla');
    assert.equal(textoDeCriacaoDoGrupo('Ana'), 'Ana criou o grupo');
    assert.equal(textoDeCriacaoDoGrupo('Ana', ['Bruno', 'Carla']), 'Ana criou o grupo e adicionou Bruno e Carla');
    assert.equal(textoDeEntradaNoGrupo('Ana', ['Bruno']), 'Ana adicionou Bruno');
    assert.equal(textoDeSaidaDoGrupo('Bruno'), 'Bruno saiu do grupo');
    assert.equal(textoDeRenomeacaoDoGrupo('Ana', 'Backend'), 'Ana renomeou o grupo para “Backend”');
    assert.equal(textoDeAparenciaDoGrupo('Ana', { cor: true, emoji: false }), 'Ana alterou a cor do grupo');
    assert.equal(textoDeAparenciaDoGrupo('Ana', { cor: false, emoji: true }), 'Ana alterou o emoji do grupo');
    assert.equal(textoDeAparenciaDoGrupo('Ana', { cor: true, emoji: true }), 'Ana alterou a cor e o emoji do grupo');
});

test('o aviso de grupo privado cita o papel de quem entrou, no singular e no plural', () => {
    assert.equal(
        textoDeGrupoPrivado([{ nome: 'Rita', tipo: TipoUsuarioEnum.GESTOR }]),
        'Rita (gestor) entrou no grupo: a conversa agora é privada e a supervisão não a lê',
    );
    assert.equal(
        textoDeGrupoPrivado([{ nome: 'Rita', tipo: TipoUsuarioEnum.GESTOR }, { nome: 'Davi', tipo: TipoUsuarioEnum.ADMINISTRADOR }]),
        'Rita (gestor) e Davi (administrador) entraram no grupo: a conversa agora é privada e a supervisão não a lê',
    );
    assert.equal(textoDoAvisoDeSupervisaoDoGrupo('Rita', TipoUsuarioEnum.GESTOR), 'Rita, gestor, leu este grupo');
    assert.equal(textoDoAvisoDeSupervisaoDoGrupo('Davi', TipoUsuarioEnum.ADMINISTRADOR), 'Davi, administrador, leu este grupo');
});

test('o ponto de leitura do grupo é o mais novo entre a leitura e a entrada', () => {
    const entrada = new Date('2026-11-02T10:00:00.000Z');
    assert.equal(pontoDeLeituraDoGrupo(null, entrada), entrada);
    assert.equal(pontoDeLeituraDoGrupo(new Date('2026-11-01T10:00:00.000Z'), entrada), entrada, 'leitura anterior à entrada vale a entrada (readicionado)');
    const lida = new Date('2026-11-03T10:00:00.000Z');
    assert.equal(pontoDeLeituraDoGrupo(lida, entrada), lida);
});
