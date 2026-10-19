import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PropostaIaService } from '../services/proposta-ia.service';
import { idCriadoPelaProposta, recuperarPropostaReferenciada } from './proposta-referenciada';

// Uma proposta que outra usa como pai (a demanda dentro do projeto que ainda vai ser criado): na hora de propor pode estar
// pendente; na hora de executar precisa estar confirmada.

const USUARIO = { sub: 9, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function proposta(sobrescrita: Record<string, unknown> = {}) {
  return { id: 5, usuarioId: 9, tipo: TipoPropostaIaEnum.CRIAR_PROJETO, status: StatusPropostaIaEnum.PENDENTE, dados: {}, resultado: null, ...sobrescrita } as never;
}

const servicoCom = (retorno: unknown) => ({ recuperarPorId: async () => ({ sucesso: true, dados: retorno }) }) as unknown as PropostaIaService;

test('recuperarPropostaReferenciada: aceita a do tipo esperado, pendente ou confirmada', async () => {
  for (const status of [StatusPropostaIaEnum.PENDENTE, StatusPropostaIaEnum.CONFIRMADA, StatusPropostaIaEnum.AJUSTADA]) {
    const encontrada = await recuperarPropostaReferenciada(servicoCom(proposta({ status })), 5, TipoPropostaIaEnum.CRIAR_PROJETO, USUARIO);
    assert.equal(encontrada.status, status);
  }
});

test('recuperarPropostaReferenciada: recusa tipo diferente do esperado e proposta inexistente', async () => {
  await assert.rejects(
    () => recuperarPropostaReferenciada(servicoCom(proposta({ tipo: TipoPropostaIaEnum.CRIAR_DEMANDA })), 5, TipoPropostaIaEnum.CRIAR_PROJETO, USUARIO),
    BusinessException,
  );
  await assert.rejects(() => recuperarPropostaReferenciada(servicoCom(undefined), 5, TipoPropostaIaEnum.CRIAR_PROJETO, USUARIO), BusinessException);
});

test('recuperarPropostaReferenciada: recusa a recusada (expirada) e a desfeita, pedindo para propor de novo', async () => {
  for (const status of [StatusPropostaIaEnum.EXPIRADA, StatusPropostaIaEnum.DESFEITA]) {
    await assert.rejects(
      () => recuperarPropostaReferenciada(servicoCom(proposta({ status })), 5, TipoPropostaIaEnum.CRIAR_PROJETO, USUARIO),
      (erro: unknown) => erro instanceof BusinessException && /proponha de novo/.test(JSON.stringify((erro as BusinessException).getResponse())),
    );
  }
});

test('recuperarPropostaReferenciada: a de outro usuário é recusada pela própria service e o erro sobe', async () => {
  const recusa = new BusinessException('Proposta não encontrada');
  const servico = { recuperarPorId: async () => { throw recusa; } } as unknown as PropostaIaService;
  await assert.rejects(() => recuperarPropostaReferenciada(servico, 5, TipoPropostaIaEnum.CRIAR_PROJETO, USUARIO), recusa);
});

test('idCriadoPelaProposta: confirmada ou ajustada devolve o id que a ação criou', () => {
  for (const status of [StatusPropostaIaEnum.CONFIRMADA, StatusPropostaIaEnum.AJUSTADA]) {
    assert.equal(idCriadoPelaProposta(proposta({ status, resultado: { projetoId: 12 } }), 'projetoId', 'o projeto'), 12);
  }
});

test('idCriadoPelaProposta: pendente, ou confirmada sem o id no resultado, manda confirmar antes', () => {
  assert.throws(() => idCriadoPelaProposta(proposta({ resultado: { projetoId: 12 } }), 'projetoId', 'o projeto'), BusinessException);
  assert.throws(
    () => idCriadoPelaProposta(proposta({ status: StatusPropostaIaEnum.CONFIRMADA, resultado: {} }), 'projetoId', 'o projeto'),
    BusinessException,
  );
  assert.throws(
    () => idCriadoPelaProposta(proposta({ status: StatusPropostaIaEnum.CONFIRMADA, resultado: { projetoId: 'abc' } }), 'projetoId', 'o projeto'),
    BusinessException,
  );
  assert.throws(
    () => idCriadoPelaProposta(proposta({ status: StatusPropostaIaEnum.DESFEITA, resultado: { projetoId: 12 } }), 'projetoId', 'o projeto'),
    BusinessException,
  );
});
