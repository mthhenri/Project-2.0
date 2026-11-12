import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { TipoGrupoEnum } from '@project20/shared';
import { GrupoRepository } from './grupo.repository';
import { MensagemDiretaReacaoRepository } from './mensagem-direta-reacao.repository';

// As reações às mensagens do chat entre colaboradores (task 314, migration 0083) no SQL real: uma por pessoa por mensagem, trocar é UPDATE,
// remover é soft delete e a leitura de várias mensagens é uma consulta só.

const reacoes = (conexao: ConexaoTeste) => criarRepositorio(MensagemDiretaReacaoRepository, conexao);

async function criarPar(conexao: ConexaoTeste) {
    const [ana, bruno] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const [menor, maior] = ana.id < bruno.id ? [ana, bruno] : [bruno, ana];
    return { ana, bruno, conversaId: `${menor.id}-${maior.id}` };
}

testarComBanco('definir: grava a reação; a mesma pessoa reagindo de novo TROCA a linha (uma por pessoa por mensagem)', async (conexao) => {
    const { ana, bruno, conversaId } = await criarPar(conexao);
    const mensagemId = randomUUID();
    const repositorio = reacoes(conexao);

    const primeira = await repositorio.definir({ mensagemId, conversaId, usuarioId: ana.id, reacao: '👍' });
    assert.deepEqual(primeira, { mensagemId, usuarioId: ana.id, reacao: '👍' });
    await repositorio.definir({ mensagemId, conversaId, usuarioId: bruno.id, reacao: '🇧🇷' });
    await repositorio.definir({ mensagemId, conversaId, usuarioId: ana.id, reacao: '👨‍👩‍👧' });

    const lidas = await repositorio.listarPorMensagens({ mensagemIds: [mensagemId] });
    assert.deepEqual(lidas.map((item) => [item.usuarioId, item.reacao]), [[ana.id, '👨‍👩‍👧'], [bruno.id, '🇧🇷']], 'o emoji volta inteiro, com ZWJ e bandeira; a troca mantém o lugar na ordem');
    const linhas = await conexao.raw(`
        SELECT
            count(*)::int AS total
        FROM
            mensagem_direta_reacao
        WHERE
            mensagem_id = ?
    `, [mensagemId]);
    assert.equal(linhas.rows[0].total, 2, 'a troca não criou linha nova');
});

testarComBanco('remover: soft delete só da reação da pessoa; reagir de novo cria uma linha nova; remover sem reação não faz nada', async (conexao) => {
    const { ana, bruno, conversaId } = await criarPar(conexao);
    const mensagemId = randomUUID();
    const repositorio = reacoes(conexao);
    await repositorio.definir({ mensagemId, conversaId, usuarioId: ana.id, reacao: '👍' });
    await repositorio.definir({ mensagemId, conversaId, usuarioId: bruno.id, reacao: '❤️' });

    await repositorio.remover({ mensagemId, usuarioId: ana.id });
    await repositorio.remover({ mensagemId, usuarioId: ana.id });
    assert.deepEqual((await repositorio.listarPorMensagens({ mensagemIds: [mensagemId] })).map((item) => item.usuarioId), [bruno.id]);

    await repositorio.definir({ mensagemId, conversaId, usuarioId: ana.id, reacao: '😂' });
    const gravadas = await conexao.raw(`
        SELECT
            is_deleted,
            deleted_date
        FROM
            mensagem_direta_reacao
        WHERE
            mensagem_id = ?
            AND usuario_id = ?
        ORDER BY
            id
    `, [mensagemId, ana.id]);
    assert.deepEqual(gravadas.rows.map((linha: { is_deleted: boolean }) => linha.is_deleted), [true, false]);
    assert.notEqual(gravadas.rows[0].deleted_date, null);
});

testarComBanco('listarPorMensagens: várias mensagens numa consulta, sem misturar; sem ids ou sem reação devolve vazio', async (conexao) => {
    const { ana, bruno, conversaId } = await criarPar(conexao);
    const [primeira, segunda, semReacao] = [randomUUID(), randomUUID(), randomUUID()];
    const repositorio = reacoes(conexao);
    await repositorio.definir({ mensagemId: primeira, conversaId, usuarioId: ana.id, reacao: '👍' });
    await repositorio.definir({ mensagemId: segunda, conversaId, usuarioId: bruno.id, reacao: '🙏' });

    const lidas = await repositorio.listarPorMensagens({ mensagemIds: [primeira, segunda, semReacao] });
    assert.deepEqual(lidas.map((item) => [item.mensagemId, item.reacao]), [[primeira, '👍'], [segunda, '🙏']]);
    assert.deepEqual(await repositorio.listarPorMensagens({ mensagemIds: [semReacao] }), []);
    assert.deepEqual(await repositorio.listarPorMensagens({ mensagemIds: [] }), []);
});

// --- reação no grupo (task 326, migration 0090) -------------------------------------------------------------------------------------------------------

async function criarGrupoDeTeste(conexao: ConexaoTeste, criadorUsuarioId: number): Promise<number> {
    const grupo = await criarRepositorio(GrupoRepository, conexao).criarGrupo({
        nome: 'Time', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null,
    });
    return grupo.grupoId;
}

testarComBanco('definir no grupo: grava o grupo e deixa a conversa nula; troca e remove como na conversa um a um', async (conexao) => {
    const [ana, bruno] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const grupoId = await criarGrupoDeTeste(conexao, ana.id);
    const mensagemId = randomUUID();
    const repositorio = reacoes(conexao);

    await repositorio.definir({ mensagemId, grupoId, usuarioId: ana.id, reacao: '👍' });
    await repositorio.definir({ mensagemId, grupoId, usuarioId: bruno.id, reacao: '❤️' });
    await repositorio.definir({ mensagemId, grupoId, usuarioId: ana.id, reacao: '😂' });
    assert.deepEqual((await repositorio.listarPorMensagens({ mensagemIds: [mensagemId] })).map((item) => [item.usuarioId, item.reacao]), [[ana.id, '😂'], [bruno.id, '❤️']]);
    const linha = (await conexao.raw(`
        SELECT
            grupo_id,
            conversa_id
        FROM
            mensagem_direta_reacao
        WHERE
            mensagem_id = ?
            AND usuario_id = ?
    `, [mensagemId, ana.id])).rows;
    assert.equal(linha.length, 1, 'a troca não criou linha nova');
    assert.deepEqual([linha[0].grupo_id, linha[0].conversa_id], [grupoId, null]);

    await repositorio.remover({ mensagemId, usuarioId: ana.id });
    assert.deepEqual((await repositorio.listarPorMensagens({ mensagemIds: [mensagemId] })).map((item) => item.usuarioId), [bruno.id]);
});

testarComBanco('o CHECK da reação exige a conversa ou o grupo, nunca os dois nem nenhum', async (conexao) => {
    const { ana, conversaId } = await criarPar(conexao);
    const grupoId = await criarGrupoDeTeste(conexao, ana.id);
    const repositorio = reacoes(conexao);
    // Cada tentativa recusada aborta a transação do teste; o ponto de salvamento a devolve ao estado de antes.
    const recusada = async (tentativa: () => Promise<unknown>, restricao: string) => {
        await conexao.raw('SAVEPOINT tentativa');
        const erro = await tentativa().then(() => null, (falha: unknown) => falha);
        assert.ok(erro, `a ${restricao} deveria recusar`);
        await conexao.raw('ROLLBACK TO SAVEPOINT tentativa');
    };
    await recusada(() => repositorio.definir({ mensagemId: randomUUID(), conversaId, grupoId, usuarioId: ana.id, reacao: '👍' }), 'os dois');
    await recusada(() => repositorio.definir({ mensagemId: randomUUID(), usuarioId: ana.id, reacao: '👍' }), 'nenhum');
    await recusada(() => repositorio.definir({ mensagemId: randomUUID(), conversaId: 'G5', usuarioId: ana.id, reacao: '👍' }), 'conversa com formato de grupo');
    // Depois de tudo recusado, a transação continua usável e a reação válida entra.
    const mensagemId = randomUUID();
    await repositorio.definir({ mensagemId, conversaId, usuarioId: ana.id, reacao: '👍' });
    assert.equal((await repositorio.listarPorMensagens({ mensagemIds: [mensagemId] })).length, 1);
});
