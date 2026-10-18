import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { limparDescricaoRedigida, montarInstrucoesDeRedacao, SEM_TRABALHO } from './redacao-da-descricao';

const BASE = { atividade: 'Ajustar login', demanda: 'Autenticação', minutos: 160, duracaoRecomendadaMinutos: 90, rigorProporcional: true };

test('execução longa com o rigor ligado pede descrição mais completa; curta pede uma ou duas frases', () => {
  assert.match(montarInstrucoesDeRedacao(BASE), /mais completa/);
  assert.match(montarInstrucoesDeRedacao({ ...BASE, minutos: 40 }), /curta: uma ou duas frases/);
});

test('com o rigor desligado a descrição é sempre curta, mesmo em execução longa', () => {
  assert.match(montarInstrucoesDeRedacao({ ...BASE, rigorProporcional: false }), /curta: uma ou duas frases/);
});

test('as instruções mandam descrever só trabalho e devolver a marca quando não há trabalho', () => {
  const texto = montarInstrucoesDeRedacao(BASE);
  assert.ok(texto.includes(SEM_TRABALHO));
  assert.match(texto, /só trabalho/);
  assert.match(texto, /Terceira pessoa, sem "eu"/);
});

test('limpa aspas, crases e o prefixo "Descrição:" da redação', () => {
  assert.equal(limparDescricaoRedigida('Descrição: Correção da validação do campo "e-mail" no cadastro.'), 'Correção da validação do campo e-mail no cadastro.');
  assert.equal(limparDescricaoRedigida('  `Ajuste` de layout  '), 'Ajuste de layout');
});
