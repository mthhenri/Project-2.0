import * as assert from 'node:assert/strict';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor, criarGestor, criarPontoJustificativa, excluirLinha } from '../../../testes/fabricas';
import { PontoJustificativaRepository } from './ponto-justificativa.repository';

// Justificativa no SQL real: `is_deleted = false` em toda leitura, ordenação por dia, filtro por mês e a unicidade
// por usuário+dia entre as não excluídas (o banco não tem índice único: a regra é `validarPorUsuarioEDia`, usada pela service).

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(PontoJustificativaRepository, conexao);

async function cenario(conexao: ConexaoTeste) {
  const usuario = await criarDesenvolvedor(conexao, { nomeCompleto: 'Ana Dev' });
  const gestor = await criarGestor(conexao, { nomeCompleto: 'Gil Gestor' });
  return { usuario, gestor };
}

testarComBanco('inserir: grava e devolve os campos, com horas como número e dia como texto', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const criada = await repositorioDe(conexao).inserir({
    usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02', nome: 'Consulta', descricao: 'Médica', horasCobertas: 2.5,
  });
  assert.equal(criada.usuarioId, usuario.id);
  assert.equal(criada.gestorId, gestor.id);
  assert.equal(criada.diaData, '2026-03-02');
  assert.equal(criada.horasCobertas, 2.5);
  assert.equal(typeof criada.horasCobertas, 'number');
});

testarComBanco('listar: só o usuário e o mês pedidos, em ordem de dia, com os nomes do usuário e do gestor', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const tarde = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-20' });
  const cedo = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02' });
  await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-04-01' });
  await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2025-03-10' });
  await criarPontoJustificativa(conexao, { usuarioId: outro.id, gestorId: gestor.id, diaData: '2026-03-05' });

  const lista = await repositorioDe(conexao).listar({ usuarioId: usuario.id, ano: 2026, mes: 3 });
  assert.deepEqual(lista.map((item) => item.id), [cedo.id, tarde.id]);
  assert.equal(lista[0].nomeUsuario, 'Ana Dev');
  assert.equal(lista[0].nomeGestor, 'Gil Gestor');
});

testarComBanco('listar e listarPorUsuarioEMes: justificativa excluída não aparece', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const mantida = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02' });
  const excluida = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-03' });
  await excluirLinha(conexao, 'ponto_justificativa', excluida.id);

  const repositorio = repositorioDe(conexao);
  const filtro = { usuarioId: usuario.id, ano: 2026, mes: 3 };
  assert.deepEqual((await repositorio.listar(filtro)).map((item) => item.id), [mantida.id]);
  assert.deepEqual((await repositorio.listarPorUsuarioEMes(filtro)).map((item) => item.id), [mantida.id]);
});

testarComBanco('recuperar: acha pelo id e devolve null para inexistente ou excluída', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const criada = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02', nome: 'Atestado' });
  const repositorio = repositorioDe(conexao);
  assert.equal((await repositorio.recuperar({ id: criada.id }))?.nome, 'Atestado');
  assert.equal(await repositorio.recuperar({ id: 0 }), null);

  await excluirLinha(conexao, 'ponto_justificativa', criada.id);
  assert.equal(await repositorio.recuperar({ id: criada.id }), null);
});

testarComBanco('recuperarPorUsuarioEDia: é a leitura que o ponto usa, só do usuário e do dia, nunca a excluída', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const doDia = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02', horasCobertas: 3 });
  await criarPontoJustificativa(conexao, { usuarioId: outro.id, gestorId: gestor.id, diaData: '2026-03-02' });
  const repositorio = repositorioDe(conexao);

  const encontrada = await repositorio.recuperarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-02' });
  assert.equal(encontrada?.id, doDia.id);
  assert.equal(encontrada?.horasCobertas, 3);
  assert.equal(await repositorio.recuperarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-03' }), null);

  await excluirLinha(conexao, 'ponto_justificativa', doDia.id);
  assert.equal(await repositorio.recuperarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-02' }), null);
});

testarComBanco('validarPorUsuarioEDia: unicidade por usuário e dia entre as não excluídas', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const existente = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02' });
  const repositorio = repositorioDe(conexao);

  assert.equal(await repositorio.validarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-02' }), true);
  assert.equal(await repositorio.validarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-03' }), false);
  assert.equal(await repositorio.validarPorUsuarioEDia({ usuarioId: outro.id, diaData: '2026-03-02' }), false);

  await excluirLinha(conexao, 'ponto_justificativa', existente.id);
  assert.equal(await repositorio.validarPorUsuarioEDia({ usuarioId: usuario.id, diaData: '2026-03-02' }), false);
});

testarComBanco('excluir: soft delete, a linha continua no banco marcada como excluída', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const criada = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02' });
  await repositorioDe(conexao).excluir({ id: criada.id });

  const resultado = await conexao.raw('SELECT is_deleted, deleted_date FROM ponto_justificativa WHERE id = :id', { id: criada.id });
  assert.equal(resultado.rows[0].is_deleted, true);
  assert.notEqual(resultado.rows[0].deleted_date, null);
});

testarComBanco('justificativa de usuário ou gestor excluído some das leituras com junção', async (conexao) => {
  const { usuario, gestor } = await cenario(conexao);
  const criada = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: '2026-03-02' });
  await excluirLinha(conexao, 'usuario', gestor.id);
  assert.equal(await repositorioDe(conexao).recuperar({ id: criada.id }), null);
});
