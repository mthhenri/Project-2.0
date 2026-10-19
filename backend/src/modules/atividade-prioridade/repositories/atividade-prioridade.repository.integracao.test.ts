import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { AtividadePrioridadeRepository } from './atividade-prioridade.repository';

// `tipo_atividade_prioridade` (migration 0036): ordem fixa e cor editável (SCHEMA.md "Tabelas de referência").

testarComBanco('listar: devolve as cinco prioridades da mais para a menos urgente, com a cor de cada uma', async (conexao) => {
  const lista = await criarRepositorio(AtividadePrioridadeRepository, conexao).listar();
  assert.deepEqual(lista.map((prioridade) => [prioridade.codigo, prioridade.ordem]), [
    ['URGENTE', 1], ['ALTA', 2], ['MEDIA', 3], ['BAIXA', 4], ['INDEFINIDA', 5],
  ]);
  assert.ok(lista.every((prioridade) => /^#[0-9a-f]{6}$/.test(prioridade.cor)), 'cor no formato #rrggbb em minúsculas');
  assert.ok(lista.every((prioridade) => prioridade.descricao.length > 0));
});

testarComBanco('alterarCor: troca só a cor — codigo, descricao e ordem ficam como estavam', async (conexao) => {
  const repositorio = criarRepositorio(AtividadePrioridadeRepository, conexao);
  const antes = (await repositorio.listar()).find((prioridade) => prioridade.codigo === 'MEDIA')!;

  const alterada = await repositorio.alterarCor(TipoAtividadePrioridadeEnum.MEDIA, '#123abc');

  assert.deepEqual(alterada, { codigo: 'MEDIA', descricao: antes.descricao, ordem: antes.ordem, cor: '#123abc' });
  const depois = await repositorio.listar();
  assert.equal(depois.find((prioridade) => prioridade.codigo === 'MEDIA')?.cor, '#123abc');
  assert.deepEqual(depois.map((prioridade) => prioridade.codigo), ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA', 'INDEFINIDA'], 'a ordem das demais não muda');
  assert.equal(depois.find((prioridade) => prioridade.codigo === 'URGENTE')?.cor, '#dc2626', 'outra prioridade não é tocada');
});

testarComBanco('alterarCor: código que não existe devolve null e nada muda', async (conexao) => {
  const repositorio = criarRepositorio(AtividadePrioridadeRepository, conexao);
  const antes = await repositorio.listar();
  assert.equal(await repositorio.alterarCor('INEXISTENTE' as TipoAtividadePrioridadeEnum, '#123abc'), null);
  assert.deepEqual(await repositorio.listar(), antes);
});

testarComBanco('alterarCor: prioridade excluída não é alterada nem listada', async (conexao) => {
  const repositorio = criarRepositorio(AtividadePrioridadeRepository, conexao);
  await conexao.raw(`UPDATE tipo_atividade_prioridade SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'BAIXA'`);
  assert.equal(await repositorio.alterarCor(TipoAtividadePrioridadeEnum.BAIXA, '#123abc'), null);
  assert.equal((await repositorio.listar()).some((prioridade) => prioridade.codigo === 'BAIXA'), false);
});
