import * as assert from 'node:assert/strict';
import { TipoGrupoEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { GrupoResumoRepository } from './grupo-resumo.repository';
import { GrupoRepository } from './grupo.repository';

// O resumo de grupo com a IA (task 249, migration 0088) no SQL real: a linha do resumo, o último do grupo e a marcação de gravado.

const resumos = (conexao: ConexaoTeste) => criarRepositorio(GrupoResumoRepository, conexao);

async function criarGrupo(conexao: ConexaoTeste) {
    const ana = await criarDesenvolvedor(conexao);
    const grupo = await criarRepositorio(GrupoRepository, conexao).criarGrupo({ nome: 'Time', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });
    return { ana, grupo };
}

const novo = (grupoId: number, usuarioId: number, fim: string) => ({
    grupoId, usuarioId, inicioData: new Date('2026-11-01T00:00:00.000Z'), fimData: new Date(fim), enviouCodigo: false, quantidadeMensagens: 7, modelo: 'modelo-x', tokensEntrada: 100, tokensSaida: 20,
});

testarComBanco('criarResumo guarda o período, o modelo e os tokens, sem proposta nem gravação', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);

    const criado = await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-10T00:00:00.000Z'));

    assert.equal(criado.grupoId, grupo.grupoId);
    assert.equal(criado.usuarioId, ana.id);
    assert.equal(criado.fimData.toISOString(), '2026-11-10T00:00:00.000Z');
    assert.equal(criado.quantidadeMensagens, 7);
    assert.equal(criado.modelo, 'modelo-x');
    assert.equal(criado.tokensEntrada, 100);
    assert.equal(criado.propostaIaId, null);
    assert.equal(criado.gravadaData, null);
});

testarComBanco('o período não pode terminar antes de começar (CHECK do banco)', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    await conexao.raw('SAVEPOINT periodo');
    await assert.rejects(resumos(conexao).criarResumo({ ...novo(grupo.grupoId, ana.id, '2026-10-01T00:00:00.000Z') }), (erro) => (erro as { code?: string }).code === '23514');
    await conexao.raw('ROLLBACK TO SAVEPOINT periodo');
});

testarComBanco('recuperarUltimoResumo: o de fim de período mais recente do grupo, e null sem resumo ou em outro grupo', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const outro = await criarRepositorio(GrupoRepository, conexao).criarGrupo({ nome: 'Outro', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });
    assert.equal(await resumos(conexao).recuperarUltimoResumo({ grupoId: grupo.grupoId }), null);

    await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-05T00:00:00.000Z'));
    const maisNovo = await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-09T00:00:00.000Z'));
    await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-03T00:00:00.000Z'));

    assert.equal((await resumos(conexao).recuperarUltimoResumo({ grupoId: grupo.grupoId }))?.resumoId, maisNovo.resumoId);
    assert.equal(await resumos(conexao).recuperarUltimoResumo({ grupoId: outro.grupoId }), null);
});

testarComBanco('recuperarResumo só devolve o resumo do grupo pedido', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const criado = await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-05T00:00:00.000Z'));

    assert.equal((await resumos(conexao).recuperarResumo({ resumoId: criado.resumoId, grupoId: grupo.grupoId }))?.resumoId, criado.resumoId);
    assert.equal(await resumos(conexao).recuperarResumo({ resumoId: criado.resumoId, grupoId: grupo.grupoId + 999 }), null);
});

testarComBanco('marcarGravado acontece uma vez só e depois dele não se marca proposta de novo', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const criado = await resumos(conexao).criarResumo(novo(grupo.grupoId, ana.id, '2026-11-05T00:00:00.000Z'));
    const gravadaData = new Date('2026-11-11T10:00:00.000Z');

    assert.equal(await resumos(conexao).marcarGravado({ resumoId: criado.resumoId, gravadaData }), true);
    assert.equal(await resumos(conexao).marcarGravado({ resumoId: criado.resumoId, gravadaData }), false, 'não grava duas vezes');
    assert.equal(await resumos(conexao).marcarProposta({ resumoId: criado.resumoId, propostaIaId: 1, demandaId: 1 }), false);
    assert.equal((await resumos(conexao).recuperarResumo({ resumoId: criado.resumoId, grupoId: grupo.grupoId }))?.gravadaData?.toISOString(), gravadaData.toISOString());
});
