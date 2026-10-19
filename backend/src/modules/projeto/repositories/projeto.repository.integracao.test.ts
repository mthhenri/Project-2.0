import * as assert from 'node:assert/strict';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarGestor, criarProjeto } from '../../../testes/fabricas';
import { ProjetoRepository } from './projeto.repository';
import { ProjetoService } from '../services/projeto.service';

// Acesso a projeto (SYSTEM.SPEC.md §13 e §14): o gestor vê todos, sem depender de `demanda_usuario`; o desenvolvedor só os
// projetos em que tem ao menos uma linha dele em `demanda_usuario`, em demanda não excluída. Não existe `projeto_usuario`.

const ids = (itens: Array<{ id: number }>) => itens.map((item) => item.id);

testarComBanco('gestor vê todos os projetos ativos, mesmo sem nenhuma linha em demanda_usuario', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const gestor = await criarGestor(conexao);
  const semDemanda = await criarProjeto(conexao);
  const comDemandaDeOutro = await criarProjeto(conexao);
  const outro = await criarDesenvolvedor(conexao);
  await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: comDemandaDeOutro.id })).id, usuarioId: outro.id });

  const { itens } = await repositorio.listarTodos({ allRows: true });
  assert.ok(ids(itens).includes(semDemanda.id));
  assert.ok(ids(itens).includes(comDemandaDeOutro.id));
  // o gestor não aparece em nenhuma tabela de acesso: nada a consultar para ele
  const { rows } = await conexao.raw('SELECT count(*)::int AS total FROM demanda_usuario WHERE demanda_usuario.usuario_id = :id', { id: gestor.id });
  assert.equal(rows[0].total, 0);
});

testarComBanco('desenvolvedor só vê os projetos em que tem demanda atribuída', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const meu = await criarProjeto(conexao);
  const deOutro = await criarProjeto(conexao);
  const semAtribuicao = await criarProjeto(conexao);
  await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: meu.id })).id, usuarioId: desenvolvedor.id });
  await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: deOutro.id })).id, usuarioId: outro.id });
  await criarDemanda(conexao, { projetoId: semAtribuicao.id });

  const { itens, total } = await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: { allRows: true } });
  assert.deepEqual(ids(itens), [meu.id]);
  assert.equal(total, 1);
});

testarComBanco('várias demandas no mesmo projeto não duplicam o projeto na lista nem no total', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  for (let indice = 0; indice < 3; indice++) {
    await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: projeto.id })).id, usuarioId: desenvolvedor.id });
  }
  const { itens, total } = await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: {} });
  assert.deepEqual(ids(itens), [projeto.id]);
  assert.equal(total, 1);
});

testarComBanco('acesso some quando a demanda ou a linha de atribuição é excluída', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const porDemandaExcluida = await criarProjeto(conexao);
  const porAtribuicaoExcluida = await criarProjeto(conexao);
  const demandaExcluida = await criarDemanda(conexao, { projetoId: porDemandaExcluida.id });
  await criarDemandaUsuario(conexao, { demandaId: demandaExcluida.id, usuarioId: desenvolvedor.id });
  const atribuicao = await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: porAtribuicaoExcluida.id })).id, usuarioId: desenvolvedor.id });
  await conexao.raw('UPDATE demanda SET is_deleted = true, deleted_date = NOW() WHERE demanda.id = :id', { id: demandaExcluida.id });
  await conexao.raw('UPDATE demanda_usuario SET is_deleted = true, deleted_date = NOW() WHERE demanda_usuario.id = :id', { id: atribuicao.id });

  const { itens } = await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: { allRows: true } });
  assert.deepEqual(itens, []);
});

testarComBanco('projeto excluído sai das duas listagens e da recuperação, mas aparece em recuperarExcluido', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: projeto.id })).id, usuarioId: desenvolvedor.id });
  await repositorio.excluir({ id: projeto.id });

  assert.ok(!ids((await repositorio.listarTodos({ allRows: true })).itens).includes(projeto.id));
  assert.deepEqual((await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: { allRows: true } })).itens, []);
  assert.equal(await repositorio.recuperar({ id: projeto.id }), null);
  assert.equal((await repositorio.recuperarExcluido({ id: projeto.id }))?.codigo, projeto.codigo);
});

testarComBanco('listagem: ordenada por nome, filtra por status e pagina com o total da busca inteira', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const marca = 'zzlist';
  await criarProjeto(conexao, { nome: `${marca} C`, codigo: `${marca}c` });
  await criarProjeto(conexao, { nome: `${marca} A`, codigo: `${marca}a` });
  await criarProjeto(conexao, { nome: `${marca} B`, codigo: `${marca}b`, statusCodigo: 'CONCLUIDO' });

  const todos = (await repositorio.listarTodos({ allRows: true })).itens.filter((item) => item.nome.startsWith(marca));
  assert.deepEqual(todos.map((item) => item.nome), [`${marca} A`, `${marca} B`, `${marca} C`]);

  const concluidos = (await repositorio.listarTodos({ status: TipoProjetoStatusEnum.CONCLUIDO, allRows: true })).itens.filter((item) => item.nome.startsWith(marca));
  assert.deepEqual(concluidos.map((item) => item.nome), [`${marca} B`]);
  assert.equal(concluidos[0].status, TipoProjetoStatusEnum.CONCLUIDO);

  const { rows } = await conexao.raw('SELECT count(*)::int AS total FROM projeto WHERE projeto.is_deleted = false');
  const pagina = await repositorio.listarTodos({ pagina: 1, itensPorPagina: 2 });
  assert.equal(pagina.itens.length, 2);
  assert.equal(pagina.total, rows[0].total);
});

testarComBanco('desenvolvedor: o filtro de status e a paginação valem na listagem dele', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const ativo = await criarProjeto(conexao, { nome: 'aa ativo' });
  const concluido = await criarProjeto(conexao, { nome: 'bb concluido', statusCodigo: 'CONCLUIDO' });
  for (const projeto of [ativo, concluido]) {
    await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: projeto.id })).id, usuarioId: desenvolvedor.id });
  }
  const soConcluidos = await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: { status: TipoProjetoStatusEnum.CONCLUIDO } });
  assert.deepEqual(ids(soConcluidos.itens), [concluido.id]);
  const segundaPagina = await repositorio.listarPorUsuario({ usuarioId: desenvolvedor.id, filtros: { pagina: 2, itensPorPagina: 1 } });
  assert.deepEqual(ids(segundaPagina.itens), [concluido.id]);
  assert.equal(segundaPagina.total, 2);
});

testarComBanco('o código é único só entre os projetos não excluídos (validarCodigo e o índice uix_projeto_codigo_ativo)', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const projeto = await criarProjeto(conexao, { codigo: 'UNICO1' });
  assert.equal(await repositorio.validarCodigo({ codigo: 'UNICO1' }), true);
  assert.equal(await repositorio.validarCodigo({ codigo: 'OUTRO' }), false);
  await assert.rejects(() => conexao.transaction((transacao) => criarProjeto(transacao, { codigo: 'UNICO1' })), /uix_projeto_codigo_ativo|duplicate/i);

  await repositorio.excluir({ id: projeto.id });
  assert.equal(await repositorio.validarCodigo({ codigo: 'UNICO1' }), false, 'código de excluído fica livre');
  const novo = await criarProjeto(conexao, { codigo: 'UNICO1' });
  assert.ok(novo.id > projeto.id);
});

testarComBanco('inserir e alterar gravam status por código e devolvem datas como texto; alterar não mexe no código', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const criado = await repositorio.inserir({
    nome: 'Novo', codigo: 'NOVO1', cor: '#123456', status: TipoProjetoStatusEnum.ATIVO, inicioData: '2026-02-01', previsaoFimData: null,
  } as never);
  assert.deepEqual([criado.status, criado.inicioData, criado.previsaoFimData], [TipoProjetoStatusEnum.ATIVO, '2026-02-01', null]);

  const alterado = await repositorio.alterar({ id: criado.id, nome: 'Renomeado', status: TipoProjetoStatusEnum.PAUSADO, previsaoFimData: '2026-12-31' });
  assert.deepEqual([alterado.nome, alterado.codigo, alterado.status, alterado.previsaoFimData], ['Renomeado', 'NOVO1', TipoProjetoStatusEnum.PAUSADO, '2026-12-31']);
});

testarComBanco('restaurar desfaz o soft delete e limpa deleted_date', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const projeto = await criarProjeto(conexao);
  await repositorio.excluir({ id: projeto.id });
  const { rows } = await conexao.raw('SELECT is_deleted, deleted_date FROM projeto WHERE projeto.id = :id', { id: projeto.id });
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);

  assert.equal((await repositorio.restaurar({ id: projeto.id })).codigo, projeto.codigo);
  assert.equal((await repositorio.recuperar({ id: projeto.id }))?.id, projeto.id);
});

testarComBanco('possuiDemandas só conta demanda não excluída', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const projeto = await criarProjeto(conexao);
  assert.equal(await repositorio.possuiDemandas({ id: projeto.id }), false);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  assert.equal(await repositorio.possuiDemandas({ id: projeto.id }), true);
  await conexao.raw('UPDATE demanda SET is_deleted = true, deleted_date = NOW() WHERE demanda.id = :id', { id: demanda.id });
  assert.equal(await repositorio.possuiDemandas({ id: projeto.id }), false);
});

// Service + repository reais: a service decide o acesso do desenvolvedor a UM projeto pela lista de acesso dele.
// P-009: `recuperar` confere o acesso numa listagem paginada (20 por página), então o 21º projeto dele dá 404.
testarComBanco('desenvolvedor com mais de 20 projetos ainda recupera o 21º', { todo: 'P-009' }, async (conexao) => {
  const servico = new ProjetoService(criarRepositorio(ProjetoRepository, conexao));
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const marca = 'zzacesso';
  let ultimo = 0;
  for (let indice = 1; indice <= 21; indice++) {
    const projeto = await criarProjeto(conexao, { nome: `${marca} ${String(indice).padStart(2, '0')}`, codigo: `${marca}${indice}` });
    await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: projeto.id })).id, usuarioId: desenvolvedor.id });
    ultimo = projeto.id;
  }
  const usuarioDoToken = { sub: desenvolvedor.id, login: desenvolvedor.login, tipo: TipoUsuarioEnum.DESENVOLVEDOR };
  const resposta = await servico.recuperar({ id: ultimo }, usuarioDoToken);
  assert.equal(resposta.dados?.id, ultimo);
});
