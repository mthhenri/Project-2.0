import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum } from '../enums/tipo-proposta-ia.enum';
import { idsDasPropostasDeQueDepende } from './proposta-dependencia';

test('criar demanda dentro de um projeto proposto depende da proposta do projeto', () => {
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { nome: 'D', projetoPropostaId: 5 }), [5]);
});

test('criar demanda dentro de uma demanda de estrutura proposta depende dela, e das duas quando há as duas', () => {
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { demandaPaiPropostaId: 6 }), [6]);
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { projetoPropostaId: 5, demandaPaiPropostaId: 6 }), [5, 6]);
});

test('criar demanda em projeto e pai que já existem não depende de proposta nenhuma', () => {
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { projetoId: 3, demandaPaiId: 4 }), []);
});

test('valor que não é um id válido não conta como dependência', () => {
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { projetoPropostaId: '5', demandaPaiPropostaId: 0 }), []);
  assert.deepEqual(idsDasPropostasDeQueDepende(TipoPropostaIaEnum.CRIAR_DEMANDA, { projetoPropostaId: 1.5 }), []);
});

test('os demais tipos não dependem de outra proposta, mesmo que os dados tragam as chaves', () => {
  for (const tipo of Object.values(TipoPropostaIaEnum).filter((valor) => valor !== TipoPropostaIaEnum.CRIAR_DEMANDA)) {
    assert.deepEqual(idsDasPropostasDeQueDepende(tipo, { projetoPropostaId: 5 }), [], tipo);
  }
});
