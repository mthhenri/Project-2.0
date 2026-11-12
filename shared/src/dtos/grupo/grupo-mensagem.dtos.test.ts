import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LIMITE_TEXTO_MENSAGEM_DIRETA } from '../../utils/mensagem-direta';
import { GrupoMensagemEditarDto } from './GrupoMensagemEditarDto';
import { GrupoMensagemReagirDto } from './GrupoMensagemReagirDto';

// O ValidationPipe do backend roda com whitelist + forbidNonWhitelisted + transform (main.ts, SYSTEM.SPEC.md §10). O `grupoId` vem da rota e nunca do corpo.
const OPCOES_DO_PIPE = { whitelist: true, forbidNonWhitelisted: true };

type Construtor<T> = new () => T;

async function erros<T extends object>(classe: Construtor<T>, carga: Record<string, unknown>): Promise<string[]> {
    const resultado = await validate(plainToInstance(classe, carga), OPCOES_DO_PIPE);
    return resultado.map((erro) => erro.property).sort();
}

const UUID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';

// --- GrupoMensagemEditarDto (task 326) ----------------------------------------

test('editar no grupo: mensagem e texto são obrigatórios; menções, @todos e referências são opcionais', async () => {
    const valido = { mensagemId: UUID, texto: 'Texto novo' };
    assert.deepEqual(await erros(GrupoMensagemEditarDto, valido), []);
    assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, mencoes: [4], mencionaTodos: true, referencias: [{ tipo: 'DEMANDA', id: 212 }] }), []);
    assert.deepEqual(await erros(GrupoMensagemEditarDto, {}), ['mensagemId', 'texto']);
});

test('editar no grupo: recusa texto vazio, só espaços, grande demais, id inválido, menção inválida e a resposta (que não se troca)', async () => {
    const valido = { mensagemId: UUID, texto: 'Texto novo' };
    for (const texto of ['', '   ', 'x'.repeat(LIMITE_TEXTO_MENSAGEM_DIRETA + 1)]) {
        assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, texto }), ['texto'], texto.slice(0, 10));
    }
    assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, mensagemId: 'abc' }), ['mensagemId']);
    assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, mencoes: [0] }), ['mencoes']);
    assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, respondeAMensagemId: UUID }), ['respondeAMensagemId']);
    assert.deepEqual(await erros(GrupoMensagemEditarDto, { ...valido, grupoId: 7 }), ['grupoId'], 'o grupo vem da rota, não do corpo');
});

// --- GrupoMensagemReagirDto (task 326) ----------------------------------------

test('reagir no grupo: a mensagem e um único emoji; null (ou ausente) remove a reação', async () => {
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: '👍' }), []);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: '🇧🇷' }), []);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: null }), []);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID }), []);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: 'ok' }), ['reacao']);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: '👍👍' }), ['reacao']);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: 'x', reacao: '👍' }), ['mensagemId']);
    assert.deepEqual(await erros(GrupoMensagemReagirDto, { mensagemId: UUID, reacao: '👍', grupoId: 7 }), ['grupoId']);
});
