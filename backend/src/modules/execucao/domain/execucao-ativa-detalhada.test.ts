import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { recuperarExecucaoAtivaDetalhada } from './execucao-ativa-detalhada';

// A execução ativa com os nomes da atividade, da demanda e do projeto, lidos da listagem da própria atividade.

const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const ATIVA = { id: 50, atividadeId: 10, descricao: 'provisória', inicioData: '2026-01-15T12:00:00Z' };
const ITEM = { id: 50, nomeAtividade: 'Ajustar login', nomeDemanda: 'Login', nomeProjeto: 'Portal', nomeUsuario: 'Ana' };

function criarServico(ativa: unknown, itens: unknown[] = [ITEM]) {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  const servico = {
    chamadas,
    recuperarAtiva: async () => { chamadas.push({ metodo: 'recuperarAtiva', argumento: undefined }); return { dados: ativa }; },
    recuperarAtivaDoUsuario: async (dto: unknown) => { chamadas.push({ metodo: 'recuperarAtivaDoUsuario', argumento: dto }); return { dados: ativa }; },
    listar: async (dto: unknown) => { chamadas.push({ metodo: 'listar', argumento: dto }); return { dados: { itens } }; },
  };
  return servico;
}

test('sem execução ativa devolve null e nem consulta a listagem', async () => {
  const servico = criarServico(null);
  assert.equal(await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR), null);
  assert.deepEqual(servico.chamadas.map((chamada) => chamada.metodo), ['recuperarAtiva']);
});

test('por padrão é a execução do usuário do token, com os nomes da listagem da atividade', async () => {
  const servico = criarServico(ATIVA);
  const detalhada = await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR);
  assert.deepEqual(detalhada, {
    id: 50, atividadeId: 10, descricao: 'provisória', inicioData: new Date('2026-01-15T12:00:00Z'),
    nomeAtividade: 'Ajustar login', nomeDemanda: 'Login', nomeProjeto: 'Portal', nomeUsuario: 'Ana',
  });
  assert.deepEqual(servico.chamadas[1], { metodo: 'listar', argumento: { usuarioId: 3, atividadeId: 10, allRows: true } });
});

test('com usuarioId de outra pessoa usa a leitura do usuário (a service recusa o desenvolvedor)', async () => {
  const servico = criarServico(ATIVA);
  await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR, 99);
  assert.deepEqual(servico.chamadas[0], { metodo: 'recuperarAtivaDoUsuario', argumento: { usuarioId: 99 } });
  assert.equal((servico.chamadas[1].argumento as { usuarioId: number }).usuarioId, 99);
});

test('usuarioId igual ao do token usa a leitura própria', async () => {
  const servico = criarServico(ATIVA);
  await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR, 3);
  assert.equal(servico.chamadas[0].metodo, 'recuperarAtiva');
});

test('se a listagem não traz a execução, os nomes ficam indefinidos mas a execução volta', async () => {
  const detalhada = await recuperarExecucaoAtivaDetalhada(criarServico(ATIVA, [{ ...ITEM, id: 999 }]) as never, DESENVOLVEDOR);
  assert.equal(detalhada?.id, 50);
  assert.equal(detalhada?.nomeAtividade, undefined);
  assert.equal(detalhada?.nomeProjeto, undefined);
});
