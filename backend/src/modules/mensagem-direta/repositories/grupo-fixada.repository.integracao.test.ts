import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { TipoGrupoEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { GrupoFixadaRepository } from './grupo-fixada.repository';
import { GrupoRepository } from './grupo.repository';

// As mensagens fixadas dos grupos (task 250, migration 0089) no SQL real.

const fixadas = (conexao: ConexaoTeste) => criarRepositorio(GrupoFixadaRepository, conexao);

async function criarGrupo(conexao: ConexaoTeste, nome = 'Time') {
    const ana = await criarDesenvolvedor(conexao);
    const grupo = await criarRepositorio(GrupoRepository, conexao).criarGrupo({ nome, tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });
    return { ana, grupo };
}

testarComBanco('fixar grava a referência e quem fixou; fixar de novo não grava outra e devolve null', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const mensagemId = randomUUID();

    const criada = await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: ana.id });
    assert.equal(criada?.mensagemId, mensagemId);
    assert.equal(criada?.fixadaPorUsuarioId, ana.id);

    assert.equal(await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: ana.id }), null);
    assert.equal((await fixadas(conexao).listarFixadas({ grupoId: grupo.grupoId })).length, 1);
    assert.equal((await fixadas(conexao).recuperarFixada({ grupoId: grupo.grupoId, mensagemId }))?.fixadaPorUsuarioId, ana.id);
});

testarComBanco('a mesma mensagem pode ser fixada em grupos diferentes, e a lista de um grupo não traz as do outro', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const outro = await criarRepositorio(GrupoRepository, conexao).criarGrupo({ nome: 'Outro', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });
    const mensagemId = randomUUID();

    await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: ana.id });
    assert.deepEqual(await fixadas(conexao).listarFixadas({ grupoId: outro.grupoId }), []);
    assert.ok(await fixadas(conexao).fixar({ grupoId: outro.grupoId, mensagemId, usuarioId: ana.id }));
});

testarComBanco('listarFixadas devolve a fixada há menos tempo primeiro', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const [primeira, segunda] = [randomUUID(), randomUUID()];
    await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId: primeira, usuarioId: ana.id });
    await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId: segunda, usuarioId: ana.id });

    assert.deepEqual((await fixadas(conexao).listarFixadas({ grupoId: grupo.grupoId })).map((fixada) => fixada.mensagemId), [segunda, primeira]);
});

testarComBanco('desafixar é exclusão lógica: some da lista, devolve false se não estava fixada e permite fixar de novo', async (conexao) => {
    const { ana, grupo } = await criarGrupo(conexao);
    const mensagemId = randomUUID();
    await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: ana.id });

    assert.equal(await fixadas(conexao).desafixar({ grupoId: grupo.grupoId, mensagemId }), true);
    assert.deepEqual(await fixadas(conexao).listarFixadas({ grupoId: grupo.grupoId }), []);
    assert.equal(await fixadas(conexao).recuperarFixada({ grupoId: grupo.grupoId, mensagemId }), null);
    assert.equal(await fixadas(conexao).desafixar({ grupoId: grupo.grupoId, mensagemId }), false);

    assert.ok(await fixadas(conexao).fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: ana.id }), 'depois de desafixada pode ser fixada de novo');
});
