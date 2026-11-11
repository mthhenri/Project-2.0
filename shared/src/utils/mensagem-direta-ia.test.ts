import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum } from '../enums/autor-mensagem-direta.enum';
import { MensagemParaPedidoDaIa, PRAZO_DO_PEDIDO_DA_IA_MINUTOS, chamadaDaIa, pedidoPendenteDaIa } from './mensagem-direta-ia';

test('chamadaDaIa: @IA no começo, no meio e no fim, sem diferenciar maiúsculas', () => {
    assert.deepEqual(chamadaDaIa('@IA cria uma atividade'), { pedido: 'cria uma atividade' });
    assert.deepEqual(chamadaDaIa('pode @ia criar a atividade?'), { pedido: 'pode criar a atividade?' });
    assert.deepEqual(chamadaDaIa('cria a atividade @Ia'), { pedido: 'cria a atividade' });
    assert.deepEqual(chamadaDaIa('@IA, resume isso'), { pedido: 'resume isso' });
});

test('chamadaDaIa: @IA sozinho dá pedido vazio', () => {
    assert.deepEqual(chamadaDaIa('@IA'), { pedido: '' });
    assert.deepEqual(chamadaDaIa('  @ia  '), { pedido: '' });
});

test('chamadaDaIa: texto sem @IA não chama', () => {
    assert.equal(chamadaDaIa('bom dia'), null);
    assert.equal(chamadaDaIa(''), null);
    assert.equal(chamadaDaIa('IA, me ajuda'), null);
});

test('chamadaDaIa: colado a outra palavra não chama', () => {
    assert.equal(chamadaDaIa('escreve para joao@IA.com'), null);
    assert.equal(chamadaDaIa('email@ia'), null);
    assert.equal(chamadaDaIa('@IAgo'), null);
    assert.equal(chamadaDaIa('@@IA'), null);
});

test('chamadaDaIa: dentro de código não chama', () => {
    assert.equal(chamadaDaIa('olha `@IA` no código'), null);
    assert.equal(chamadaDaIa('```ts\nconst x = "@IA";\n```'), null);
    assert.deepEqual(chamadaDaIa('@IA explica isto:\n```ts\nconst x = "@IA";\n```'), { pedido: 'explica isto:\n```ts\nconst x = "@IA";\n```' });
});

const AGORA = new Date('2026-11-11T12:00:00Z');
const minutosAntes = (minutos: number): Date => new Date(AGORA.getTime() - minutos * 60_000);
const doUsuario = (usuarioId: number, texto: string, minutos: number): MensagemParaPedidoDaIa => ({
    autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: usuarioId, texto, createdDate: minutosAntes(minutos), chamadaPorUsuarioId: null,
});
const daIa = (chamadaPor: number, minutos: number): MensagemParaPedidoDaIa => ({
    autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'feito', createdDate: minutosAntes(minutos), chamadaPorUsuarioId: chamadaPor,
});

test('pedidoPendenteDaIa: @IA sozinho dentro do prazo espera o pedido', () => {
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3)], 4, AGORA), true);
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', PRAZO_DO_PEDIDO_DA_IA_MINUTOS)], 4, AGORA), true);
});

test('pedidoPendenteDaIa: fora do prazo não espera mais', () => {
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', PRAZO_DO_PEDIDO_DA_IA_MINUTOS + 0.01)], 4, AGORA), false);
});

test('pedidoPendenteDaIa: a mensagem da outra pessoa no meio não conta', () => {
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3), doUsuario(7, 'opa', 2)], 4, AGORA), true);
    // A outra pessoa não herda o @IA de quem chamou.
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3)], 7, AGORA), false);
});

test('pedidoPendenteDaIa: a última mensagem de quem chamou precisa ser o @IA sozinho', () => {
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3), doUsuario(4, 'esquece', 2)], 4, AGORA), false);
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA cria a atividade', 3)], 4, AGORA), false);
    assert.equal(pedidoPendenteDaIa([], 4, AGORA), false);
});

test('pedidoPendenteDaIa: já respondido pela IA não espera de novo', () => {
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3), daIa(4, 2)], 4, AGORA), false);
    // A resposta a outra pessoa não fecha o pedido de quem chamou.
    assert.equal(pedidoPendenteDaIa([doUsuario(4, '@IA', 3), daIa(7, 2)], 4, AGORA), true);
});
