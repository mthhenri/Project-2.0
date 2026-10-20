import * as assert from 'node:assert/strict';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAtividade, criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarExecucao, criarGestor, criarProjeto, excluirLinha } from '../../../testes/fabricas';
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

testarComBanco('volume esperado: inserir grava, alterar muda e null limpa; recuperar devolve', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const criado = await repositorio.inserir({
    nome: 'Com volume', codigo: 'VOL1', cor: '#123456', status: TipoProjetoStatusEnum.ATIVO, inicioData: null, previsaoFimData: null, volumeEsperadoHorasMes: 40,
  } as never);
  assert.equal(criado.volumeEsperadoHorasMes, 40);
  assert.equal((await repositorio.recuperar({ id: criado.id }))?.volumeEsperadoHorasMes, 40);

  assert.equal((await repositorio.alterar({ id: criado.id, volumeEsperadoHorasMes: 80 })).volumeEsperadoHorasMes, 80);
  assert.equal((await repositorio.alterar({ id: criado.id, nome: 'Outro nome' })).volumeEsperadoHorasMes, 80);
  assert.equal((await repositorio.alterar({ id: criado.id, volumeEsperadoHorasMes: null })).volumeEsperadoHorasMes, null);

  const semVolume = await repositorio.inserir({
    nome: 'Sem volume', codigo: 'VOL2', cor: '#123456', status: TipoProjetoStatusEnum.ATIVO, inicioData: null, previsaoFimData: null,
  } as never);
  assert.equal(semVolume.volumeEsperadoHorasMes, null);
});

testarComBanco('a coluna recusa volume esperado negativo', async (conexao) => {
  const projeto = await criarProjeto(conexao);
  await assert.rejects(() => conexao.raw('UPDATE projeto SET volume_esperado_horas_mes = -1 WHERE projeto.id = :id', { id: projeto.id }), /chk_projeto_volume_esperado_horas_mes/);
});

testarComBanco('listarVolume soma só as execuções encerradas do mês, nas atividades e demandas ativas, e devolve 0 sem execução', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projetoA = await criarProjeto(conexao);
  const projetoB = await criarProjeto(conexao);
  const projetoVazio = await criarProjeto(conexao);
  await conexao.raw('UPDATE projeto SET volume_esperado_horas_mes = 40 WHERE projeto.id = :id', { id: projetoA.id });

  const demandaA = await criarDemanda(conexao, { projetoId: projetoA.id });
  const demandaB = await criarDemanda(conexao, { projetoId: projetoB.id });
  const atividadeA = await criarAtividade(conexao, { demandaId: demandaA.id, usuarioId: desenvolvedor.id });
  const atividadeB = await criarAtividade(conexao, { demandaId: demandaB.id, usuarioId: desenvolvedor.id });

  // Projeto A em outubro/2026 (fuso do sistema, -03:00): 2 h + 1 h30 = 210 min; a execução em andamento, a de setembro e a de novembro ficam fora.
  await criarExecucao(conexao, { atividadeId: atividadeA.id, inicioData: '2026-10-05T09:00:00-03:00', fimData: '2026-10-05T11:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividadeA.id, inicioData: '2026-10-31T22:00:00-03:00', fimData: '2026-10-31T23:30:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividadeA.id, inicioData: '2026-10-20T09:00:00-03:00', fimData: null });
  await criarExecucao(conexao, { atividadeId: atividadeA.id, inicioData: '2026-09-30T09:00:00-03:00', fimData: '2026-09-30T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividadeA.id, inicioData: '2026-11-01T09:00:00-03:00', fimData: '2026-11-01T10:00:00-03:00' });
  // Projeto B: 1 h, mais uma execução excluída que não conta.
  await criarExecucao(conexao, { atividadeId: atividadeB.id, inicioData: '2026-10-10T09:00:00-03:00', fimData: '2026-10-10T10:00:00-03:00' });
  const excluida = await criarExecucao(conexao, { atividadeId: atividadeB.id, inicioData: '2026-10-11T09:00:00-03:00', fimData: '2026-10-11T12:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);

  const volume = await repositorio.listarVolume({ dataInicio: '2026-10-01', dataFim: '2026-10-31' });
  const porProjeto = new Map(volume.map((item) => [item.projetoId, item]));
  assert.deepEqual([porProjeto.get(projetoA.id)?.minutosGastos, porProjeto.get(projetoA.id)?.volumeEsperadoHorasMes], [210, 40]);
  assert.deepEqual([porProjeto.get(projetoB.id)?.minutosGastos, porProjeto.get(projetoB.id)?.volumeEsperadoHorasMes], [60, null]);
  assert.deepEqual([porProjeto.get(projetoVazio.id)?.minutosGastos, porProjeto.get(projetoVazio.id)?.volumeEsperadoHorasMes], [0, null]);

  // Projeto excluído sai da visão.
  await excluirLinha(conexao, 'projeto', projetoVazio.id);
  assert.equal((await repositorio.listarVolume({ dataInicio: '2026-10-01', dataFim: '2026-10-31' })).some((item) => item.projetoId === projetoVazio.id), false);
});

testarComBanco('listarVolumePorMes devolve 12 linhas por projeto, com os minutos de cada mês e a virada do mês pelo fuso', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: desenvolvedor.id });
  await conexao.raw('UPDATE projeto SET volume_esperado_horas_mes = 40 WHERE projeto.id = :id', { id: projeto.id });

  // 31/10 22:00 -03:00 já é 01/11 em UTC: conta em outubro (fuso do sistema). Em andamento e excluída ficam fora; 2025 fica fora do ano.
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-10-31T22:00:00-03:00', fimData: '2026-10-31T23:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-10-05T09:00:00-03:00', fimData: '2026-10-05T10:30:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-09-02T09:00:00-03:00', fimData: '2026-09-02T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-10-20T09:00:00-03:00', fimData: null });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2025-10-05T09:00:00-03:00', fimData: '2025-10-05T10:00:00-03:00' });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-10-11T09:00:00-03:00', fimData: '2026-10-11T12:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);

  const linhas = (await repositorio.listarVolumePorMes({ dataInicio: '2026-01-01', dataFim: '2026-12-31' })).filter((linha) => linha.projetoId === projeto.id);
  assert.deepEqual(linhas.map((linha) => linha.mes), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const porMes = new Map(linhas.map((linha) => [linha.mes, linha.minutosGastos]));
  assert.deepEqual([porMes.get(9), porMes.get(10), porMes.get(11), porMes.get(1)], [60, 150, 0, 0]);
  assert.equal(linhas[0].volumeEsperadoHorasMes, 40);
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
testarComBanco('desenvolvedor com mais de 20 projetos ainda recupera o 21º', async (conexao) => {
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

testarComBanco('validarAcesso: só vale com demanda e atribuição não excluídas, no projeto certo e para o usuário certo', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const outroProjeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const atribuicao = await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: desenvolvedor.id });

  assert.equal(await repositorio.validarAcesso({ usuarioId: desenvolvedor.id, projetoId: projeto.id }), true);
  assert.equal(await repositorio.validarAcesso({ usuarioId: outro.id, projetoId: projeto.id }), false, 'outro usuário');
  assert.equal(await repositorio.validarAcesso({ usuarioId: desenvolvedor.id, projetoId: outroProjeto.id }), false, 'outro projeto');

  await conexao.raw('UPDATE demanda_usuario SET is_deleted = true, deleted_date = NOW() WHERE demanda_usuario.id = :id', { id: atribuicao.id });
  assert.equal(await repositorio.validarAcesso({ usuarioId: desenvolvedor.id, projetoId: projeto.id }), false, 'atribuição excluída');
  await conexao.raw('UPDATE demanda_usuario SET is_deleted = false, deleted_date = NULL WHERE demanda_usuario.id = :id', { id: atribuicao.id });
  await conexao.raw('UPDATE demanda SET is_deleted = true, deleted_date = NOW() WHERE demanda.id = :id', { id: demanda.id });
  assert.equal(await repositorio.validarAcesso({ usuarioId: desenvolvedor.id, projetoId: projeto.id }), false, 'demanda excluída');
});

testarComBanco('validarAcesso é falso para projeto excluído, mesmo com demanda atribuída', async (conexao) => {
  const repositorio = criarRepositorio(ProjetoRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  await criarDemandaUsuario(conexao, { demandaId: (await criarDemanda(conexao, { projetoId: projeto.id })).id, usuarioId: desenvolvedor.id });
  await repositorio.excluir({ id: projeto.id });
  assert.equal(await repositorio.validarAcesso({ usuarioId: desenvolvedor.id, projetoId: projeto.id }), false);
});
