import * as assert from 'node:assert/strict';
import { TipoGrupoEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDemanda, criarDesenvolvedor, criarGestor, criarProjeto } from '../../../testes/fabricas';
import { GrupoLeituraRepository } from './grupo-leitura.repository';
import { GrupoRepository } from './grupo.repository';

// Os grupos do chat entre colaboradores (task 246) no SQL real: grupo, membros (entrar, sair, readicionar, fim do grupo) e o marcador de leitura
// (migration 0087). As mensagens ficam no armazenamento; aqui só `grupo`, `grupo_membro` e `grupo_leitura`.

const grupos = (conexao: ConexaoTeste) => criarRepositorio(GrupoRepository, conexao);
const leitura = (conexao: ConexaoTeste) => criarRepositorio(GrupoLeituraRepository, conexao);

async function criarGrupoDeDuas(conexao: ConexaoTeste) {
    const [ana, bruno] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const grupo = await grupos(conexao).criarGrupo({
        nome: 'Time do backend',
        tipo: TipoGrupoEnum.LIVRE,
        criadorUsuarioId: ana.id,
        corAvatar: null,
        emojiAvatar: null,
        projetoId: null,
        demandaId: null,
    });
    await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: ana.id, entradaData: new Date('2026-11-01T10:00:00.000Z') });
    await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: bruno.id, entradaData: new Date('2026-11-01T10:05:00.000Z') });
    return { ana, bruno, grupo };
}

// --- grupo -----------------------------------------------------------------

testarComBanco('criarGrupo: devolve o grupo com o tipo traduzido, sem cor nem emoji quando não escolhidos', async (conexao) => {
    const { ana, grupo } = await criarGrupoDeDuas(conexao);

    assert.equal(grupo.nome, 'Time do backend');
    assert.equal(grupo.tipo, TipoGrupoEnum.LIVRE);
    assert.equal(grupo.criadorUsuarioId, ana.id);
    assert.equal(grupo.corAvatar, null);
    assert.equal(grupo.emojiAvatar, null);
    assert.equal(grupo.projetoId, null);
    assert.equal(grupo.demandaId, null);
});

testarComBanco('alterarGrupo: troca nome, cor e emoji; grupo inexistente devolve null', async (conexao) => {
    const { grupo } = await criarGrupoDeDuas(conexao);

    const alterado = await grupos(conexao).alterarGrupo({ grupoId: grupo.grupoId, nome: 'Backend', corAvatar: '#3366FF', emojiAvatar: '🚀' });
    assert.equal(alterado?.nome, 'Backend');
    assert.equal(alterado?.corAvatar, '#3366FF');
    assert.equal(alterado?.emojiAvatar, '🚀');

    const semCor = await grupos(conexao).alterarGrupo({ grupoId: grupo.grupoId, nome: 'Backend', corAvatar: null, emojiAvatar: null });
    assert.equal(semCor?.corAvatar, null);
    assert.equal(semCor?.emojiAvatar, null);

    assert.equal(await grupos(conexao).alterarGrupo({ grupoId: 999999, nome: 'x', corAvatar: null, emojiAvatar: null }), null);
});

testarComBanco('listarGruposDoUsuario: só os grupos em que a pessoa é membro agora', async (conexao) => {
    const { ana, bruno, grupo } = await criarGrupoDeDuas(conexao);
    const outra = await criarDesenvolvedor(conexao);

    assert.deepEqual((await grupos(conexao).listarGruposDoUsuario({ usuarioId: ana.id })).map((item) => item.grupoId), [grupo.grupoId]);
    assert.deepEqual(await grupos(conexao).listarGruposDoUsuario({ usuarioId: outra.id }), []);

    await grupos(conexao).sairDoGrupo({ grupoId: grupo.grupoId, usuarioId: bruno.id, saidaData: new Date('2026-11-02T10:00:00.000Z') });
    assert.deepEqual(await grupos(conexao).listarGruposDoUsuario({ usuarioId: bruno.id }), [], 'quem saiu não vê mais o grupo');
});

// --- membros ---------------------------------------------------------------

testarComBanco('adicionarMembro: pessoa nova entra; quem já é membro devolve null; grupo inexistente devolve null', async (conexao) => {
    const { ana, grupo } = await criarGrupoDeDuas(conexao);
    const carla = await criarDesenvolvedor(conexao);

    const entrou = await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: carla.id, entradaData: new Date('2026-11-02T09:00:00.000Z') });
    assert.equal(entrou?.usuarioId, carla.id);
    assert.equal(entrou?.entradaData.toISOString(), '2026-11-02T09:00:00.000Z');
    assert.equal(entrou?.saidaData, null);

    assert.equal(await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: ana.id, entradaData: new Date() }), null);
    assert.equal(await grupos(conexao).adicionarMembro({ grupoId: 999999, usuarioId: carla.id, entradaData: new Date() }), null);
    assert.equal((await grupos(conexao).listarMembros({ grupoId: grupo.grupoId })).length, 3);
});

testarComBanco('sairDoGrupo e readicionar: a saída fica registrada e a mesma linha é reaberta com a entrada nova', async (conexao) => {
    const { bruno, grupo } = await criarGrupoDeDuas(conexao);

    const saida = await grupos(conexao).sairDoGrupo({ grupoId: grupo.grupoId, usuarioId: bruno.id, saidaData: new Date('2026-11-02T10:00:00.000Z') });
    assert.deepEqual(saida, { grupoEncerrado: false });
    const saiu = await grupos(conexao).recuperarMembro({ grupoId: grupo.grupoId, usuarioId: bruno.id });
    assert.equal(saiu?.saidaData?.toISOString(), '2026-11-02T10:00:00.000Z');
    assert.equal((await grupos(conexao).listarMembros({ grupoId: grupo.grupoId })).length, 1);

    assert.equal(await grupos(conexao).sairDoGrupo({ grupoId: grupo.grupoId, usuarioId: bruno.id, saidaData: new Date() }), null, 'sair duas vezes não repete');

    const voltou = await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: bruno.id, entradaData: new Date('2026-11-03T08:00:00.000Z') });
    assert.equal(voltou?.saidaData, null);
    assert.equal(voltou?.entradaData.toISOString(), '2026-11-03T08:00:00.000Z');
    assert.equal((await grupos(conexao).listarMembros({ grupoId: grupo.grupoId })).length, 2);
});

testarComBanco('sairDoGrupo: o último membro a sair encerra o grupo, que deixa de existir para as consultas', async (conexao) => {
    const { ana, bruno, grupo } = await criarGrupoDeDuas(conexao);

    await grupos(conexao).sairDoGrupo({ grupoId: grupo.grupoId, usuarioId: ana.id, saidaData: new Date('2026-11-02T10:00:00.000Z') });
    const ultimo = await grupos(conexao).sairDoGrupo({ grupoId: grupo.grupoId, usuarioId: bruno.id, saidaData: new Date('2026-11-02T10:01:00.000Z') });

    assert.deepEqual(ultimo, { grupoEncerrado: true });
    assert.equal(await grupos(conexao).recuperarGrupo({ grupoId: grupo.grupoId }), null);
    assert.equal(await grupos(conexao).recuperarMembro({ grupoId: grupo.grupoId, usuarioId: ana.id }), null);
    assert.equal(await grupos(conexao).adicionarMembro({ grupoId: grupo.grupoId, usuarioId: ana.id, entradaData: new Date() }), null, 'grupo encerrado não readmite');
});

// --- leitura ---------------------------------------------------------------

testarComBanco('alterarLeitura: avança e NUNCA recua; silenciar não apaga a leitura e ler não desfaz o silêncio', async (conexao) => {
    const { ana, grupo } = await criarGrupoDeDuas(conexao);
    const dto = { grupoId: grupo.grupoId, usuarioId: ana.id };

    const primeira = await leitura(conexao).alterarLeitura({ ...dto, lidaAteData: new Date('2026-11-02T14:00:00.000Z') });
    assert.equal(primeira.lidaAteData?.toISOString(), '2026-11-02T14:00:00.000Z');
    assert.equal(primeira.silenciada, false);

    const atrasada = await leitura(conexao).alterarLeitura({ ...dto, lidaAteData: new Date('2026-11-02T13:00:00.000Z') });
    assert.equal(atrasada.lidaAteData?.toISOString(), '2026-11-02T14:00:00.000Z');

    const silenciada = await leitura(conexao).alterarSilencio({ ...dto, silenciada: true });
    assert.equal(silenciada.silenciada, true);
    assert.equal(silenciada.lidaAteData?.toISOString(), '2026-11-02T14:00:00.000Z');

    const lida = await leitura(conexao).alterarLeitura({ ...dto, lidaAteData: new Date('2026-11-02T16:00:00.000Z') });
    assert.equal(lida.silenciada, true);
});

testarComBanco('alterarSilencio antes de ler cria o marcador sem data; um marcador por pessoa e grupo', async (conexao) => {
    const { ana, bruno, grupo } = await criarGrupoDeDuas(conexao);

    const gravado = await leitura(conexao).alterarSilencio({ grupoId: grupo.grupoId, usuarioId: ana.id, silenciada: true });
    assert.equal(gravado.lidaAteData, null);

    await leitura(conexao).alterarLeitura({ grupoId: grupo.grupoId, usuarioId: ana.id, lidaAteData: new Date('2026-11-02T14:00:00.000Z') });
    assert.equal((await leitura(conexao).listarMarcadores({ usuarioId: ana.id })).length, 1);
    assert.equal(await leitura(conexao).recuperarMarcador({ grupoId: grupo.grupoId, usuarioId: bruno.id }), null, 'o marcador de uma pessoa não aparece na outra');
});

// --- canais (task 248) -------------------------------------------------------

async function criarCanais(conexao: ConexaoTeste) {
    const ana = await criarDesenvolvedor(conexao);
    const projeto = await criarProjeto(conexao);
    const raiz = await criarDemanda(conexao, { projetoId: projeto.id });
    const filha = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: raiz.id });
    const base = { nome: 'Canal', criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null };
    const daRaiz = await grupos(conexao).criarGrupo({ ...base, tipo: TipoGrupoEnum.DEMANDA, projetoId: projeto.id, demandaId: raiz.id });
    const doProjeto = await grupos(conexao).criarGrupo({ ...base, tipo: TipoGrupoEnum.PROJETO, projetoId: projeto.id, demandaId: null });
    return { ana, projeto, raiz, filha, daRaiz, doProjeto };
}

testarComBanco('recuperarCanalPorAlvo: o canal da demanda e o do projeto são distintos e um alvo sem canal devolve null', async (conexao) => {
    const { projeto, raiz, filha, daRaiz, doProjeto } = await criarCanais(conexao);

    assert.equal((await grupos(conexao).recuperarCanalPorAlvo({ demandaId: raiz.id, projetoId: projeto.id }))?.grupoId, daRaiz.grupoId);
    assert.equal((await grupos(conexao).recuperarCanalPorAlvo({ demandaId: null, projetoId: projeto.id }))?.grupoId, doProjeto.grupoId, 'o canal do projeto não é o da demanda do mesmo projeto');
    assert.equal(await grupos(conexao).recuperarCanalPorAlvo({ demandaId: filha.id, projetoId: projeto.id }), null, 'a filha não herda o canal da raiz');
    assert.equal((await grupos(conexao).recuperarCanalPorAlvo({ demandaId: raiz.id, projetoId: projeto.id }))?.tipo, TipoGrupoEnum.DEMANDA);
});

testarComBanco('os índices únicos garantem um canal por demanda e um por projeto (a segunda criação falha com 23505)', async (conexao) => {
    const { ana, projeto, raiz } = await criarCanais(conexao);
    const base = { nome: 'Outro', criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null };

    await conexao.raw('SAVEPOINT duplicado');
    await assert.rejects(
        grupos(conexao).criarGrupo({ ...base, tipo: TipoGrupoEnum.DEMANDA, projetoId: projeto.id, demandaId: raiz.id }),
        (erro) => (erro as { code?: string }).code === '23505',
    );
    await conexao.raw('ROLLBACK TO SAVEPOINT duplicado');
    await assert.rejects(
        grupos(conexao).criarGrupo({ ...base, tipo: TipoGrupoEnum.PROJETO, projetoId: projeto.id, demandaId: null }),
        (erro) => (erro as { code?: string }).code === '23505',
    );
});

testarComBanco('listarCanais: pelos ids de demanda e de projeto informados, sem o grupo livre e sem o canal de outra demanda', async (conexao) => {
    const { ana, projeto, raiz, filha, daRaiz, doProjeto } = await criarCanais(conexao);
    await grupos(conexao).criarGrupo({ nome: 'Livre', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });

    const ids = async (dto: { demandaIds: number[]; projetoIds: number[] }) => (await grupos(conexao).listarCanais(dto)).map((canal) => canal.grupoId).sort((primeiro, segundo) => primeiro - segundo);
    assert.deepEqual(await ids({ demandaIds: [raiz.id, filha.id], projetoIds: [projeto.id] }), [daRaiz.grupoId, doProjeto.grupoId]);
    assert.deepEqual(await ids({ demandaIds: [filha.id], projetoIds: [] }), []);
    assert.deepEqual(await ids({ demandaIds: [], projetoIds: [projeto.id] }), [doProjeto.grupoId], 'projetoIds pega o canal do projeto, não o da demanda');
    assert.deepEqual(await ids({ demandaIds: [], projetoIds: [] }), []);
});

testarComBanco('listarCanaisSupervisionaveis: todos os canais, menos aqueles em que o leitor é membro agora', async (conexao) => {
    const { ana, daRaiz, doProjeto } = await criarCanais(conexao);
    const gestor = await criarGestor(conexao);
    await grupos(conexao).criarGrupo({ nome: 'Livre', tipo: TipoGrupoEnum.LIVRE, criadorUsuarioId: ana.id, corAvatar: null, emojiAvatar: null, projetoId: null, demandaId: null });

    const antes = (await grupos(conexao).listarCanaisSupervisionaveis({ leitorUsuarioId: gestor.id })).map((canal) => canal.grupoId);
    assert.ok(antes.includes(daRaiz.grupoId) && antes.includes(doProjeto.grupoId));

    await grupos(conexao).adicionarMembro({ grupoId: daRaiz.grupoId, usuarioId: gestor.id, entradaData: new Date('2026-11-01T10:00:00.000Z') });
    const depois = await grupos(conexao).listarCanaisSupervisionaveis({ leitorUsuarioId: gestor.id });
    assert.equal(depois.some((canal) => canal.grupoId === daRaiz.grupoId), false);
    assert.equal(depois.some((canal) => canal.grupoId === doProjeto.grupoId), true);
    assert.equal(depois.some((canal) => canal.tipo === TipoGrupoEnum.LIVRE), false);
});
