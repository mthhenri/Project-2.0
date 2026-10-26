import * as assert from 'node:assert/strict';
import { TipoPlanoPontoSituacaoEnum as Situacao } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarGestor } from '../../../testes/fabricas';
import { PlanoPontoRepository } from './plano-ponto.repository';
import { PlanoRepository } from './plano.repository';

// Repository dos pontos em aberto (task 235): SQL contra o PostgreSQL de teste.

async function planoNovo(conexao: ConexaoTeste) {
  const criador = await criarGestor(conexao);
  const { id } = await criarRepositorio(PlanoRepository, conexao).inserir({ titulo: 'Plano', projetoId: null, usuarioId: criador.id });
  return id;
}

testarComBanco('inserir grava o ponto aberto, com o rótulo livre e sem resolução', async (conexao) => {
  const repositorio = criarRepositorio(PlanoPontoRepository, conexao);
  const planoId = await planoNovo(conexao);

  const criado = await repositorio.inserir({ planoId, rotulo: 'Qualquer rótulo que a IA escolher', texto: 'Falta definir o formato' });
  const lido = await repositorio.recuperar({ planoId, id: criado.id });

  assert.equal(criado.situacao, Situacao.ABERTO);
  assert.equal(lido?.rotulo, 'Qualquer rótulo que a IA escolher');
  assert.equal(lido?.situacao, Situacao.ABERTO);
  assert.equal(lido?.resolucaoTexto, null);
});

testarComBanco('listar põe os abertos primeiro (do mais antigo) e depois os fechados (do mais recente)', async (conexao) => {
  const repositorio = criarRepositorio(PlanoPontoRepository, conexao);
  const planoId = await planoNovo(conexao);
  const primeiro = await repositorio.inserir({ planoId, rotulo: 'A', texto: 'primeiro aberto' });
  const fechado = await repositorio.inserir({ planoId, rotulo: 'B', texto: 'vai fechar' });
  const segundo = await repositorio.inserir({ planoId, rotulo: 'C', texto: 'segundo aberto' });
  await repositorio.alterarSituacao({ planoId, id: fechado.id, situacao: Situacao.RESOLVIDO, resolucaoTexto: 'Resolvido assim' });

  const lista = await repositorio.listar({ planoId });

  assert.deepEqual(lista.map((ponto) => ponto.id), [primeiro.id, segundo.id, fechado.id]);
  assert.equal(lista[2].situacao, Situacao.RESOLVIDO);
  assert.equal(lista[2].resolucaoTexto, 'Resolvido assim');
});

testarComBanco('alterarSituacao resolve, dispensa, registra decisão e reabre limpando a resolução', async (conexao) => {
  const repositorio = criarRepositorio(PlanoPontoRepository, conexao);
  const planoId = await planoNovo(conexao);
  const { id } = await repositorio.inserir({ planoId, rotulo: 'Dúvida', texto: 'Quem exporta?' });

  const dispensado = await repositorio.alterarSituacao({ planoId, id, situacao: Situacao.DISPENSADO, resolucaoTexto: null });
  assert.deepEqual([dispensado?.situacao, dispensado?.resolucaoTexto], [Situacao.DISPENSADO, null]);

  const decisao = await repositorio.alterarSituacao({ planoId, id, situacao: Situacao.DECISAO, resolucaoTexto: 'Só gestor' });
  assert.deepEqual([decisao?.situacao, decisao?.resolucaoTexto], [Situacao.DECISAO, 'Só gestor']);

  const reaberto = await repositorio.alterarSituacao({ planoId, id, situacao: Situacao.ABERTO, resolucaoTexto: null });
  assert.deepEqual([reaberto?.situacao, reaberto?.resolucaoTexto], [Situacao.ABERTO, null]);
  assert.equal((await repositorio.recuperar({ planoId, id }))?.resolucaoTexto, null);
});

testarComBanco('o ponto de outro plano não é achado nem alterado', async (conexao) => {
  const repositorio = criarRepositorio(PlanoPontoRepository, conexao);
  const planoId = await planoNovo(conexao);
  const outroPlanoId = await planoNovo(conexao);
  const { id } = await repositorio.inserir({ planoId, rotulo: 'X', texto: 'y' });

  assert.equal(await repositorio.recuperar({ planoId: outroPlanoId, id }), null);
  assert.equal(await repositorio.alterarSituacao({ planoId: outroPlanoId, id, situacao: Situacao.DISPENSADO, resolucaoTexto: null }), null);
  assert.equal((await repositorio.recuperar({ planoId, id }))?.situacao, Situacao.ABERTO);
});
