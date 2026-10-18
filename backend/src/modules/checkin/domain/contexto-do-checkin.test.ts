import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DadosDoContextoDoCheckin, formatarDuracao, montarContextoDoCheckin } from './contexto-do-checkin';

const BASE: DadosDoContextoDoCheckin = {
  atividade: 'Ajustar login',
  demanda: 'Autenticação',
  projeto: 'Loja',
  descricaoProvisoria: 'Validar e-mail',
  inicio: '09:10',
  minutos: 160,
  duracaoRecomendadaMinutos: 90,
  rigorProporcional: true,
};

test('formata a duração como a conversa a diz', () => {
  assert.equal(formatarDuracao(45), '45 min');
  assert.equal(formatarDuracao(90), '1h30');
  assert.equal(formatarDuracao(160), '2h40');
  assert.equal(formatarDuracao(125), '2h05');
  assert.equal(formatarDuracao(-5), '0 min');
});

test('acima do recomendado com o rigor ligado, pede mais detalhe antes de descrever', () => {
  const texto = montarContextoDoCheckin(BASE);
  assert.match(texto, /passou da duração recomendada \(2h40 contra 1h30\)/);
  assert.match(texto, /foram 2h40, teve mais alguma coisa\?/);
  assert.match(texto, /Isso não é uma trava/);
});

test('dentro do recomendado com o rigor ligado, vai direto à descrição', () => {
  const texto = montarContextoDoCheckin({ ...BASE, minutos: 40 });
  assert.match(texto, /dentro do recomendado: vá direto à descrição/);
  assert.doesNotMatch(texto, /teve mais alguma coisa/);
});

test('com o rigor desligado, não há instrução de rigor em nenhum dos casos', () => {
  for (const minutos of [40, 160]) {
    const texto = montarContextoDoCheckin({ ...BASE, minutos, rigorProporcional: false });
    assert.doesNotMatch(texto, /recomendado: vá direto|passou da duração recomendada/);
  }
});

test('leva a execução, a descrição provisória e a regra da narrativa crua', () => {
  const texto = montarContextoDoCheckin(BASE);
  assert.match(texto, /"Ajustar login" \(demanda "Autenticação", projeto "Loja"\), iniciada às 09:10, há 2h40/);
  assert.match(texto, /Descrição provisória atual: "Validar e-mail"/);
  assert.match(texto, /só a descrição formal vai para a execução/);
  assert.match(texto, /Descrição proposta/);
});
