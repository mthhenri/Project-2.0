import * as assert from 'node:assert/strict';
import { ConexaoTeste, testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { IaCustoRepository } from './ia-custo.repository';

async function gravarUsoEm(conexao: ConexaoTeste, dia: string, modelo: string, tokensEntrada: number): Promise<void> {
  await conexao.raw(
    `INSERT INTO ia_uso (created_date, updated_date, is_deleted, uso_data, modelo, tokens_entrada, tokens_saida, tokens_cache)
     SELECT NOW(), NOW(), false, :uso::timestamptz, :modelo, :tokensEntrada, 10, 5`,
    { uso: `${dia}T15:00:00-03:00`, modelo, tokensEntrada },
  );
}

testarComBanco('registrarUso grava o modelo e os tokens da chamada', async (conexao) => {
  const repositorio = criarRepositorio(IaCustoRepository, conexao);
  await repositorio.registrarUso({ modelo: 'modelo-teste-registro', tokensEntrada: 100, tokensSaida: 20, tokensCache: 7 });
  const { rows } = await conexao.raw(`SELECT * FROM ia_uso WHERE modelo = 'modelo-teste-registro' AND is_deleted = false`);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].tokens_entrada, rows[0].tokens_saida, rows[0].tokens_cache], [100, 20, 7]);
});

testarComBanco('somarUso soma por dia e por modelo dentro do recorte e deixa de fora o resto e o excluído', async (conexao) => {
  const repositorio = criarRepositorio(IaCustoRepository, conexao);
  await gravarUsoEm(conexao, '2031-03-05', 'modelo-soma-a', 100);
  await gravarUsoEm(conexao, '2031-03-05', 'modelo-soma-a', 50);
  await gravarUsoEm(conexao, '2031-03-05', 'modelo-soma-b', 1);
  await gravarUsoEm(conexao, '2031-03-20', 'modelo-soma-a', 7);
  await gravarUsoEm(conexao, '2031-04-01', 'modelo-soma-a', 999);
  await gravarUsoEm(conexao, '2031-03-06', 'modelo-soma-a', 500);
  await conexao.raw(`UPDATE ia_uso SET is_deleted = true, deleted_date = NOW() WHERE tokens_entrada = 500 AND modelo = 'modelo-soma-a'`);

  const porDia = (await repositorio.somarUso({ dataInicio: '2031-03-01', dataFim: '2031-03-31', porMes: false })).filter((linha) => linha.modelo.startsWith('modelo-soma-'));
  const chave = (periodo: string, modelo: string) => porDia.find((linha) => linha.periodo === periodo && linha.modelo === modelo);
  assert.equal(porDia.length, 3);
  assert.deepEqual([chave('2031-03-05', 'modelo-soma-a')?.chamadas, chave('2031-03-05', 'modelo-soma-a')?.tokensEntrada, chave('2031-03-05', 'modelo-soma-a')?.tokensSaida], [2, 150, 20]);
  assert.equal(chave('2031-03-20', 'modelo-soma-a')?.tokensEntrada, 7);

  const porMes = (await repositorio.somarUso({ dataInicio: '2031-01-01', dataFim: '2031-12-31', porMes: true })).filter((linha) => linha.modelo === 'modelo-soma-a');
  assert.deepEqual(porMes.map((linha) => [linha.periodo, linha.tokensEntrada]).sort(), [['2031-03', 157], ['2031-04', 999]]);
});

testarComBanco('salvarPreco cria o preço do modelo e, na segunda vez, troca o mesmo registro', async (conexao) => {
  const repositorio = criarRepositorio(IaCustoRepository, conexao);
  const criado = await repositorio.salvarPreco({ modelo: 'modelo-preco', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 });
  assert.deepEqual(criado, { modelo: 'modelo-preco', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 });

  const trocado = await repositorio.salvarPreco({ modelo: 'modelo-preco', precoEntradaMilhao: 4.5, precoSaidaMilhao: 20, precoCacheMilhao: 0.45 });
  assert.equal(trocado.precoEntradaMilhao, 4.5);

  const precos = (await repositorio.listarPrecos()).filter((preco) => preco.modelo === 'modelo-preco');
  assert.deepEqual(precos, [{ modelo: 'modelo-preco', precoEntradaMilhao: 4.5, precoSaidaMilhao: 20, precoCacheMilhao: 0.45 }]);
});
