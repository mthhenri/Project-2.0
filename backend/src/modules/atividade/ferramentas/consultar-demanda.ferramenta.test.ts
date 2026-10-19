import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { DemandaService } from '../../demanda/services/demanda.service';
import { AtividadeService } from '../services/atividade.service';
import { ConsultarDemandaFerramenta, LIMITE_ATIVIDADES_DA_DEMANDA, LIMITE_DE_TEXTO_DA_DEMANDA } from './consultar-demanda.ferramenta';

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;

const DEMANDA = {
  id: 9, nome: 'Autenticação', projetoId: 3, demandaPaiId: null, isEstrutural: false, status: TipoDemandaStatusEnum.PENDENTE, horasEstimadas: 8,
  previsaoFimData: null, descricaoTecnica: 'Técnica', descricaoCliente: null, documentacao: 'Docs',
};

function montar(demanda: Record<string, unknown> | null = DEMANDA, atividades: { itens: unknown[]; totalItens: number } = { itens: [], totalItens: 0 }) {
  const listagens: unknown[][] = [];
  const demandaService = {
    recuperar: async () => ({ dados: demanda }),
    listarTagsDemanda: async () => ({ dados: [{ id: 1, nome: 'Backend', cor: '#112233' }] }),
  };
  const atividadeService = { listar: async (...argumentos: unknown[]) => { listagens.push(argumentos); return { dados: atividades }; } };
  const ferramenta = new ConsultarDemandaFerramenta(demandaService as unknown as DemandaService, atividadeService as unknown as AtividadeService);
  return { ferramenta, listagens };
}

test('é ferramenta de leitura só do gestor', () => {
  const { ferramenta } = montar();
  assert.deepEqual([ferramenta.nome, ferramenta.tipo, ferramenta.permissao], ['consultar_demanda', 'LEITURA', 'GESTOR']);
});

test('devolve a demanda com tags por nome e as atividades resumidas, lidas com o usuário do token e o limite da ferramenta', async () => {
  const atividade = { id: 5, nome: 'Login', status: 'PLANEJADA', nomeUsuario: 'Ana', totalMinutosExecutados: 90, execucaoAtivaId: 44, extra: 'ignorado' };
  const { ferramenta, listagens } = montar(DEMANDA, { itens: [atividade, { ...atividade, id: 6, execucaoAtivaId: null }], totalItens: 2 });

  const resultado = await ferramenta.executar({ demandaId: 9 }, GESTOR);

  assert.deepEqual(listagens, [[{ demandaId: 9, itensPorPagina: LIMITE_ATIVIDADES_DA_DEMANDA }, GESTOR]]);
  assert.deepEqual(resultado.tags, ['Backend']);
  assert.deepEqual(resultado.atividades[0], { id: 5, nome: 'Login', status: 'PLANEJADA', usuario: 'Ana', minutosExecutados: 90, emExecucao: true });
  assert.equal(resultado.atividades[1].emExecucao, false);
  assert.deepEqual([resultado.totalAtividades, resultado.haMaisAtividades, resultado.textoCortado], [2, false, false]);
});

test('corta o texto longo no limite e avisa; texto curto e nulo passam como estão', async () => {
  const longo = 'x'.repeat(LIMITE_DE_TEXTO_DA_DEMANDA + 10);
  const { ferramenta } = montar({ ...DEMANDA, descricaoTecnica: longo });
  const resultado = await ferramenta.executar({ demandaId: 9 }, GESTOR);
  assert.equal(resultado.descricaoTecnica?.length, LIMITE_DE_TEXTO_DA_DEMANDA);
  assert.equal(resultado.textoCortado, true);
  assert.equal(resultado.descricaoCliente, null);
  assert.equal(resultado.documentacao, 'Docs');
});

test('avisa que há mais atividades quando o total passa do que veio', async () => {
  const itens = [{ id: 1, nome: 'A', status: 'PLANEJADA', nomeUsuario: 'Ana', totalMinutosExecutados: 0, execucaoAtivaId: null }];
  const { ferramenta } = montar(DEMANDA, { itens, totalItens: 45 });
  const resultado = await ferramenta.executar({ demandaId: 9 }, GESTOR);
  assert.deepEqual([resultado.totalAtividades, resultado.haMaisAtividades], [45, true]);
});

test('demanda não encontrada vira erro da ferramenta', async () => {
  const { ferramenta } = montar(null);
  await assert.rejects(ferramenta.executar({ demandaId: 9 }, GESTOR), /Demanda não encontrada/);
});
