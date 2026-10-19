import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StreamableFile } from '@nestjs/common';
import { RelatorioFormatoEnum, RelatorioPeriodoTipoEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { RelatorioController } from './relatorio.controller';

// SYSTEM.SPEC.md §14 ("Ver execuções de todos": gestor ✅, desenvolvedor ❌): toda rota do relatório é só de gestor.

const rotas = () => rotasPorNome(RelatorioController);

test('verbos e caminhos das rotas do relatório', () => {
  assert.deepEqual(
    Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET execucao', 'GET execucao/download', 'POST execucao/revisar'].sort(),
  );
});

test('toda rota é exclusiva de gestor e nenhuma é pública', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.gestorOnly, true, rota.nome);
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

const PERIODO = { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026, mes: 10 };

test('gerar e revisar juntam o projetoId da query ao DTO', async () => {
  const chamadas: unknown[][] = [];
  const controller = new RelatorioController({
    gerarRelatorio: async (dto: unknown) => { chamadas.push(['gerar', dto]); return null; },
    revisarRelatorio: async (dto: unknown) => { chamadas.push(['revisar', dto]); return null; },
  } as never);

  await controller.gerar(PERIODO, 3);
  await controller.revisar(PERIODO, 4);

  assert.deepEqual(chamadas, [
    ['gerar', { ...PERIODO, projetoId: 3 }],
    ['revisar', { ...PERIODO, projetoId: 4 }],
  ]);
});

test('baixar devolve o arquivo com Content-Type e Content-Disposition de anexo', async () => {
  const cabecalhos: Record<string, string> = {};
  const recebidos: unknown[] = [];
  const conteudo = Buffer.from('a,b');
  const controller = new RelatorioController({
    baixarRelatorio: async (dto: unknown) => {
      recebidos.push(dto);
      return { conteudo, nomeArquivo: 'relatorio-execucoes_LOJA_2026-10-01_2026-10-31.csv', mimeType: 'text/csv; charset=utf-8' };
    },
  } as never);
  const resposta = { setHeader: (nome: string, valor: string) => { cabecalhos[nome] = valor; } };

  const retorno = await controller.baixar({ ...PERIODO, formato: RelatorioFormatoEnum.CSV }, 3, resposta as never);

  assert.deepEqual(recebidos, [{ ...PERIODO, formato: RelatorioFormatoEnum.CSV, projetoId: 3 }]);
  assert.equal(cabecalhos['Content-Type'], 'text/csv; charset=utf-8');
  assert.equal(cabecalhos['Content-Disposition'], 'attachment; filename="relatorio-execucoes_LOJA_2026-10-01_2026-10-31.csv"');
  assert.ok(retorno instanceof StreamableFile);
});
