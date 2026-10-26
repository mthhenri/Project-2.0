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

test('não pergunta se vai trocar: percebe pelo relato, troca com TROCAR e cria o bloco só quando falta', () => {
  const texto = montarContextoDoCheckin(BASE);
  assert.doesNotMatch(texto, /Pergunte também se ele continua/);
  assert.match(texto, /Não pergunte se ele vai trocar de atividade: perceba pelo relato/);
  assert.match(texto, /propor_descrever_execucao e escolha TROCAR/);
  assert.match(texto, /consultar_checklist_da_demanda/);
  assert.match(texto, /nunca uma atividade por execução/);
  assert.match(texto, /Em dúvida real, continue na mesma/);
});

test('bloco acabado: marca DESENVOLVIDA na ordem que a regra de status permite', () => {
  const texto = montarContextoDoCheckin(BASE);
  assert.match(texto, /DESENVOLVIDA \(propor_alterar_atividade\)/);
  assert.match(texto, /não muda de status: descreva trocando para a próxima atividade/);
  assert.match(texto, /propor_pausar_execucao e marque/);
});

test('acima do recomendado avisa do tempo, com o rigor ligado ou não, e nunca como trava', () => {
  for (const rigorProporcional of [true, false]) {
    const texto = montarContextoDoCheckin({ ...BASE, rigorProporcional });
    assert.match(texto, /está nisso há bastante tempo/);
    assert.match(texto, /quebrar o bloco em atividades menores/);
    assert.match(texto, /nunca é trava/);
  }
});

test('dentro do recomendado não há aviso de tempo', () => {
  for (const rigorProporcional of [true, false]) {
    assert.doesNotMatch(montarContextoDoCheckin({ ...BASE, minutos: 40, rigorProporcional }), /há bastante tempo/);
  }
});

test('leva a execução, a descrição provisória e a regra da narrativa crua', () => {
  const texto = montarContextoDoCheckin(BASE);
  assert.match(texto, /"Ajustar login" \(demanda "Autenticação", projeto "Loja"\), iniciada às 09:10, há 2h40/);
  assert.match(texto, /Descrição provisória atual: "Validar e-mail"/);
  assert.match(texto, /só a descrição formal vai para a execução/);
  assert.match(texto, /propor_descrever_execucao/);
  assert.match(texto, /Não escreva a descrição você mesmo/);
});
