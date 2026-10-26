import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPlanoPontoSituacaoEnum as Situacao, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PlanoPontoService } from '../services/plano-ponto.service';
import { AnotarPontoEmAbertoFerramenta, ListarPontosDoPlanoFerramenta, ResolverPontoDoPlanoFerramenta } from './pontos-do-plano.ferramentas';

// Ferramentas dos pontos em aberto (task 235): só a conversa do planejamento as vê; rodam em nome do usuário.

const USUARIO = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criarServico() {
  const chamadas: Array<{ metodo: string; argumentos: unknown[] }> = [];
  const servico = {
    criar: async (...argumentos: unknown[]) => { chamadas.push({ metodo: 'criar', argumentos }); return { dados: { id: 12 } }; },
    alterarSituacao: async (...argumentos: unknown[]) => { chamadas.push({ metodo: 'alterarSituacao', argumentos }); return { dados: { id: 12, situacao: (argumentos[0] as { situacao: Situacao }).situacao } }; },
    listar: async () => ({ dados: [{ id: 3, rotulo: 'Risco', texto: 'Sem teste', situacao: Situacao.ABERTO, resolucaoTexto: null }] }),
  };
  return { servico: servico as unknown as PlanoPontoService, chamadas };
}

test('as três ferramentas são do planejamento: o chat de perguntas não as vê', () => {
  const { servico } = criarServico();
  for (const ferramenta of [new AnotarPontoEmAbertoFerramenta(servico), new ResolverPontoDoPlanoFerramenta(servico), new ListarPontosDoPlanoFerramenta(servico)]) {
    assert.equal(ferramenta.somentePlanejamento, true, ferramenta.nome);
  }
});

test('anotar_ponto_em_aberto cria o ponto com o rótulo livre em nome do usuário do token', async () => {
  const { servico, chamadas } = criarServico();
  const resultado = (await new AnotarPontoEmAbertoFerramenta(servico).executar({ planoId: 7, rotulo: 'Fora do escopo', texto: 'Exportar em Excel' }, USUARIO)) as { pontoId: number };

  assert.equal(resultado.pontoId, 12);
  assert.deepEqual(chamadas[0].argumentos, [{ planoId: 7, rotulo: 'Fora do escopo', texto: 'Exportar em Excel' }, USUARIO]);
});

test('resolver_ponto_do_plano fecha como resolvido, dispensado ou decisão, e não reabre', async () => {
  const { servico, chamadas } = criarServico();
  const ferramenta = new ResolverPontoDoPlanoFerramenta(servico);
  await ferramenta.executar({ planoId: 7, pontoId: 3, situacao: Situacao.RESOLVIDO, resolucaoTexto: 'Só gestor' }, USUARIO);
  await ferramenta.executar({ planoId: 7, pontoId: 3, situacao: Situacao.DECISAO, resolucaoTexto: 'PDF' }, USUARIO);
  assert.deepEqual(chamadas.map((chamada) => (chamada.argumentos[0] as { situacao: Situacao }).situacao), [Situacao.RESOLVIDO, Situacao.DECISAO]);
  assert.deepEqual(chamadas[0].argumentos[0], { planoId: 7, id: 3, situacao: Situacao.RESOLVIDO, resolucaoTexto: 'Só gestor' });

  await assert.rejects(() => ferramenta.executar({ planoId: 7, pontoId: 3, situacao: Situacao.ABERTO }, USUARIO), BusinessException);
  assert.equal(chamadas.length, 2);
});

test('listar_pontos_do_plano devolve id, rótulo, texto, situação e resolução', async () => {
  const resultado = await new ListarPontosDoPlanoFerramenta(criarServico().servico).executar({ planoId: 7 }, USUARIO);
  assert.deepEqual(resultado, [{ id: 3, rotulo: 'Risco', texto: 'Sem teste', situacao: Situacao.ABERTO, resolucao: null }]);
});
