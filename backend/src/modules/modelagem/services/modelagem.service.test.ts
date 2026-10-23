import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChaveBanco, ColunaBanco } from '../domain/modelagem';
import { CONFIGURACAO_MODELAGEM } from '../domain/modelagem.configuracao';
import { ModelagemRepository } from '../repositories/modelagem.repository';
import { ModelagemService } from './modelagem.service';

function coluna(tabela: string, nome: string, extras: Partial<ColunaBanco> = {}): ColunaBanco {
  return { tabela, coluna: nome, tipo: 'integer', tipoInterno: 'int4', anulavel: false, padrao: null, ...extras };
}

function montar(ultimaMigration: string | null = '0099 - Teste.sql') {
  const chamadas = { colunas: 0 };
  const repositorio = {
    listarColunas: async () => {
      chamadas.colunas++;
      return [coluna('projeto', 'id', { padrao: "nextval('x'::regclass)" }), coluna('demanda', 'id', { padrao: "nextval('y'::regclass)" }), coluna('demanda', 'projeto_id')];
    },
    listarChavesPrimarias: async (): Promise<ChaveBanco[]> => [{ tabela: 'projeto', coluna: 'id' }, { tabela: 'demanda', coluna: 'id' }],
    listarChavesEstrangeiras: async (): Promise<ChaveBanco[]> => [{ tabela: 'demanda', coluna: 'projeto_id', tabelaDestino: 'projeto', colunaDestino: 'id' }],
    obterUltimaMigration: async () => ultimaMigration,
  } as unknown as ModelagemRepository;
  return { service: new ModelagemService(repositorio), chamadas };
}

test('monta o diagrama do catálogo com a origem, os grupos da configuração e as marcas de chave', async () => {
  const { service } = montar();
  const resposta = await service.obterDiagrama();
  assert.equal(resposta.sucesso, true);
  const diagrama = resposta.dados!;
  assert.equal(diagrama.origem, 'PostgreSQL · última migration: 0099 - Teste');
  assert.deepEqual(diagrama.colunasOcultas, CONFIGURACAO_MODELAGEM.colunasOcultas);
  const demanda = diagrama.tabelas.find((tabela) => tabela.nome === 'demanda')!;
  assert.equal(demanda.grupo, 'dom');
  assert.deepEqual(demanda.colunas.map((coluna) => [coluna.nome, coluna.marca, coluna.tabelaReferenciada]), [['id', 'pk', null], ['projeto_id', 'fk', 'projeto']]);
  assert.deepEqual([demanda.x, demanda.y], CONFIGURACAO_MODELAGEM.posicoes['demanda']);
});

test('sem migration aplicada a origem diz isso', async () => {
  const { service } = montar(null);
  assert.match((await service.obterDiagrama()).dados!.origem, /nenhuma aplicada/);
});

test('reaproveita o diagrama em memória nas chamadas seguidas e relê depois do prazo', async (contexto) => {
  const { service, chamadas } = montar();
  const relogio = contexto.mock.method(Date, 'now', () => 1_000);
  await service.obterDiagrama();
  await service.obterDiagrama();
  assert.equal(chamadas.colunas, 1);
  relogio.mock.mockImplementation(() => 1_000 + 61_000);
  await service.obterDiagrama();
  assert.equal(chamadas.colunas, 2);
});
