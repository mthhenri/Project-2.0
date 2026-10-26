import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPlanoPontoSituacaoEnum as Situacao, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { PlanoPontoRepository } from '../repositories/plano-ponto.repository';
import { PlanoPontoService } from './plano-ponto.service';
import { PlanoService } from './plano.service';

// Pontos em aberto do plano (task 235): acesso do plano, texto obrigatório de resolver e decidir, dispensar com motivo opcional, reabrir.

const USUARIO = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criarServico(opcoes: { semAcessoAoPlano?: boolean; ponto?: unknown } = {}) {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  const repositorio = {
    inserir: async (dto: unknown) => { chamadas.push({ metodo: 'inserir', argumento: dto }); return { id: 9, situacao: Situacao.ABERTO, ...(dto as object) }; },
    listar: async (dto: unknown) => { chamadas.push({ metodo: 'listar', argumento: dto }); return [{ id: 9 }]; },
    recuperar: async () => ('ponto' in opcoes ? opcoes.ponto : { id: 9, planoId: 7, situacao: Situacao.ABERTO }),
    alterarSituacao: async (dto: { id: number; situacao: Situacao; resolucaoTexto: string | null }) => { chamadas.push({ metodo: 'alterarSituacao', argumento: dto }); return { id: dto.id, situacao: dto.situacao, resolucaoTexto: dto.resolucaoTexto }; },
  };
  const planoService = { recuperar: async () => { if (opcoes.semAcessoAoPlano) throw new ResourceNotFoundException('Plano'); return { dados: { id: 7 } }; } };
  const servico = new PlanoPontoService(repositorio as unknown as PlanoPontoRepository, planoService as unknown as PlanoService);
  return { servico, chamadas };
}

test('quem não vê o plano não cria, lista nem altera pontos (404, nada gravado)', async () => {
  const { servico, chamadas } = criarServico({ semAcessoAoPlano: true });
  await assert.rejects(() => servico.criar({ planoId: 7, rotulo: 'Lacuna', texto: 'x' }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.listar({ planoId: 7 }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.DISPENSADO }, USUARIO), ResourceNotFoundException);
  assert.deepEqual(chamadas, []);
});

test('criar apara o rótulo (texto livre, sem lista fechada) e o texto, e recusa em branco', async () => {
  const { servico, chamadas } = criarServico();
  const resposta = await servico.criar({ planoId: 7, rotulo: '  Peso   demais ', texto: '  Esta demanda tem escopo de duas.  ' }, USUARIO);
  assert.deepEqual(chamadas[0].argumento, { planoId: 7, rotulo: 'Peso demais', texto: 'Esta demanda tem escopo de duas.' });
  assert.equal(resposta.dados?.situacao, Situacao.ABERTO);
  await assert.rejects(() => servico.criar({ planoId: 7, rotulo: '  ', texto: 'x' }, USUARIO), BusinessException);
  await assert.rejects(() => servico.criar({ planoId: 7, rotulo: 'Risco', texto: '   ' }, USUARIO), BusinessException);
});

test('resolver e registrar decisão exigem o texto; dispensar aceita com ou sem motivo', async () => {
  const { servico, chamadas } = criarServico();
  await assert.rejects(() => servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.RESOLVIDO }, USUARIO), BusinessException);
  await assert.rejects(() => servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.DECISAO, resolucaoTexto: '  ' }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);

  await servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.RESOLVIDO, resolucaoTexto: ' Só gestor ' }, USUARIO);
  await servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.DISPENSADO, resolucaoTexto: 'Fica para depois' }, USUARIO);
  await servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.DISPENSADO }, USUARIO);
  assert.deepEqual(chamadas.map((chamada) => (chamada.argumento as { resolucaoTexto: string | null }).resolucaoTexto), ['Só gestor', 'Fica para depois', null]);
});

test('reabrir apaga a resolução, mesmo que venha um texto', async () => {
  const { servico, chamadas } = criarServico();
  await servico.alterarSituacao({ planoId: 7, id: 9, situacao: Situacao.ABERTO, resolucaoTexto: 'ignorado' }, USUARIO);
  assert.equal((chamadas[0].argumento as { resolucaoTexto: unknown }).resolucaoTexto, null);
});

test('ponto que não é do plano é "não encontrado"', async () => {
  const { servico, chamadas } = criarServico({ ponto: null });
  await assert.rejects(() => servico.alterarSituacao({ planoId: 7, id: 99, situacao: Situacao.DISPENSADO }, USUARIO), ResourceNotFoundException);
  assert.deepEqual(chamadas, []);
});
