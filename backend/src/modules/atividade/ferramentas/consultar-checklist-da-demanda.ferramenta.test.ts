import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { DemandaService } from '../../demanda/services/demanda.service';
import { AtividadeService } from '../services/atividade.service';
import { ConsultarChecklistDaDemandaFerramenta, LIMITE_ATIVIDADES_DO_CHECKLIST } from './consultar-checklist-da-demanda.ferramenta';

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function atividade(id: number, parcial: Record<string, unknown> = {}) {
  return { id, nome: `Bloco ${id}`, status: 'DESENVOLVENDO', nomeUsuario: 'Ana', totalMinutosExecutados: 90, totalExecucoes: 3, execucaoAtivaId: null, descricaoCliente: 'não vaza', ...parcial };
}

function montar(podeEditar: boolean, itens: unknown[] = [], totalItens = itens.length) {
  const listagens: unknown[][] = [];
  const demandaService = { recuperar: async () => ({ dados: { id: 9, nome: 'Cadastro de usuário', descricaoCliente: 'segredo', podeEditar } }) };
  const atividadeService = { listar: async (...argumentos: unknown[]) => { listagens.push(argumentos); return { dados: { itens, totalItens } }; } };
  const ferramenta = new ConsultarChecklistDaDemandaFerramenta(demandaService as unknown as DemandaService, atividadeService as unknown as AtividadeService);
  return { ferramenta, listagens };
}

test('é ferramenta de leitura liberada a qualquer tipo de usuário', () => {
  const { ferramenta } = montar(true);
  assert.deepEqual([ferramenta.nome, ferramenta.tipo, ferramenta.permissao], ['consultar_checklist_da_demanda', 'LEITURA', 'QUALQUER']);
});

test('o desenvolvedor da demanda lê o checklist com o usuário do token e o limite da ferramenta', async () => {
  const { ferramenta, listagens } = montar(true, [atividade(5, { execucaoAtivaId: 44 }), atividade(6)]);

  const resultado = await ferramenta.executar({ demandaId: 9 }, DESENVOLVEDOR);

  assert.deepEqual(listagens, [[{ demandaId: 9, itensPorPagina: LIMITE_ATIVIDADES_DO_CHECKLIST }, DESENVOLVEDOR]]);
  assert.equal(resultado.demanda, 'Cadastro de usuário');
  assert.deepEqual(resultado.atividades[0], { id: 5, nome: 'Bloco 5', status: 'DESENVOLVENDO', usuario: 'Ana', minutosExecutados: 90, totalExecucoes: 3, emExecucao: true });
  assert.equal(resultado.atividades[1].emExecucao, false);
  assert.equal(resultado.haMais, false);
});

test('não expõe as descrições da demanda nem campos extras da atividade', async () => {
  const { ferramenta } = montar(true, [atividade(5)]);
  const texto = JSON.stringify(await ferramenta.executar({ demandaId: 9 }, DESENVOLVEDOR));
  assert.equal(texto.includes('segredo'), false);
  assert.equal(texto.includes('não vaza'), false);
});

test('o desenvolvedor de fora da demanda é recusado e nada é listado', async () => {
  const { ferramenta, listagens } = montar(false, [atividade(5)]);
  await assert.rejects(ferramenta.executar({ demandaId: 9 }, DESENVOLVEDOR), (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes('acesso ao checklist'));
  assert.equal(listagens.length, 0);
});

test('o gestor lê o checklist e a lista longa vira "há mais"', async () => {
  const { ferramenta } = montar(true, [atividade(1)], LIMITE_ATIVIDADES_DO_CHECKLIST + 5);
  const resultado = await ferramenta.executar({ demandaId: 9 }, GESTOR);
  assert.equal(resultado.total, LIMITE_ATIVIDADES_DO_CHECKLIST + 5);
  assert.equal(resultado.haMais, true);
});
