import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { IaException, IaMotivoFalha, traduzirFalhaDeIa } from './ia.exception';

// SYSTEM.SPEC.md §12 (`ia`): falhas viram `IaException`, nunca o erro do SDK; quem já tem contrato HTTP usa `traduzirFalhaDeIa`.

const mensagemDe = (erro: BusinessException) => (erro.getResponse() as { mensagem: string }).mensagem;

test('IaException carrega o motivo e a mensagem e responde 503 no envelope padrão', () => {
  const erro = new IaException('LIMITE', 'Limite de uso atingido');
  assert.equal(erro.motivo, 'LIMITE');
  assert.equal(erro.mensagem, 'Limite de uso atingido');
  assert.equal(erro.getStatus(), HttpStatus.SERVICE_UNAVAILABLE);
  assert.deepEqual(erro.getResponse(), { sucesso: false, mensagem: 'Limite de uso atingido', dados: null, erros: [] });
});

test('traduzirFalhaDeIa: cada motivo vira BusinessException (400) com a mensagem do motivo', () => {
  const motivos: IaMotivoFalha[] = ['DESLIGADA', 'INDISPONIVEL', 'LIMITE', 'CONFIGURACAO'];
  for (const motivo of motivos) {
    const traduzida = traduzirFalhaDeIa(new IaException(motivo, `mensagem ${motivo}`));
    assert.ok(traduzida instanceof BusinessException, motivo);
    assert.equal(traduzida.getStatus(), HttpStatus.BAD_REQUEST, motivo);
    assert.equal(mensagemDe(traduzida), `mensagem ${motivo}`, motivo);
  }
});

test('traduzirFalhaDeIa: erro desconhecido (inclusive o cru do SDK) vira a mensagem genérica, sem vazar o detalhe', () => {
  for (const erro of [new Error('401 invalid x-api-key sk-secreta'), 'texto solto', null, undefined]) {
    const traduzida = traduzirFalhaDeIa(erro);
    assert.ok(traduzida instanceof BusinessException);
    assert.equal(mensagemDe(traduzida), 'Serviço de IA temporariamente indisponível');
  }
});
