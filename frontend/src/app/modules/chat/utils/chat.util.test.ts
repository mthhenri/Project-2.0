import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { dataDaConversa, extrairEventos, formatarDuracao, LIMITE_MENSAGEM_CHAT, mensagemInicialDoLink, paresDosDados, rotuloDoDia, semMarcacaoMarkdown, sugestoesAposProposta, sugestoesIniciais } from './chat.util';

test('lê vários eventos de uma vez', () => {
  const texto = 'data: {"tipo":"trecho","texto":"Bom "}\n\ndata: {"tipo":"trecho","texto":"dia"}\n\n';
  const { eventos, resto } = extrairEventos(texto);
  assert.deepEqual(eventos, [{ tipo: 'trecho', texto: 'Bom ' }, { tipo: 'trecho', texto: 'dia' }]);
  assert.equal(resto, '');
});

test('guarda o pedaço incompleto para a próxima leitura', () => {
  const primeira = extrairEventos('data: {"tipo":"trecho","texto":"a"}\n\ndata: {"tipo":"tre');
  assert.equal(primeira.eventos.length, 1);
  assert.equal(primeira.resto, 'data: {"tipo":"tre');
  const segunda = extrairEventos(primeira.resto + 'cho","texto":"b"}\n\n');
  assert.deepEqual(segunda.eventos, [{ tipo: 'trecho', texto: 'b' }]);
});

test('o corte pode cair no meio do separador', () => {
  const primeira = extrairEventos('data: {"tipo":"proposta","propostaId":3}\n');
  assert.equal(primeira.eventos.length, 0);
  const segunda = extrairEventos(primeira.resto + '\n');
  assert.deepEqual(segunda.eventos, [{ tipo: 'proposta', propostaId: 3 }]);
});

test('ignora evento malformado e linhas que não são dados (comentários do fluxo)', () => {
  const { eventos } = extrairEventos(': ping\n\ndata: {quebrado\n\ndata: {"tipo":"erro","mensagem":"x"}\n\n');
  assert.deepEqual(eventos, [{ tipo: 'erro', mensagem: 'x' }]);
});

test('texto com acento e quebra de linha dentro do JSON chega inteiro', () => {
  const evento = JSON.stringify({ tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' });
  const { eventos } = extrairEventos(`data: ${evento}\n\n`);
  assert.deepEqual(eventos, [{ tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' }]);
});

test('pares dos dados mostram texto puro e JSON para o resto', () => {
  assert.deepEqual(paresDosDados({ nome: 'Corrigir login', ids: [1, 2], obrigatorio: true }), [
    { chave: 'nome', valor: 'Corrigir login' },
    { chave: 'ids', valor: '[1,2]' },
    { chave: 'obrigatorio', valor: 'true' },
  ]);
});

test('o dia da conversa é o final do id', () => {
  assert.equal(dataDaConversa('7-2026-10-17'), '2026-10-17');
  assert.equal(dataDaConversa('123-2026-01-05'), '2026-01-05');
});

test('rotula hoje, ontem e os outros dias, inclusive na virada de mês', () => {
  assert.equal(rotuloDoDia('2026-10-17', '2026-10-17'), 'Hoje');
  assert.equal(rotuloDoDia('2026-10-16', '2026-10-17'), 'Ontem');
  assert.equal(rotuloDoDia('2026-09-30', '2026-10-01'), 'Ontem');
  assert.match(rotuloDoDia('2026-10-10', '2026-10-17'), /^sáb\.?, 10\/10\/2026$/);
});

test('tira a marcação do Markdown e junta tudo numa linha', () => {
  const comMarcacao = ['Boa noite! **Plano do dia**', '', '1. **AAAA**: Integrações', '- Item'].join(String.fromCharCode(10));
  assert.equal(semMarcacaoMarkdown(comMarcacao), 'Boa noite! Plano do dia AAAA: Integrações Item');
  assert.equal(semMarcacaoMarkdown('  `código` e > citação  '), 'código e citação');
});

test('formata a duração como o cartão a diz', () => {
  assert.equal(formatarDuracao(45), '45 min');
  assert.equal(formatarDuracao(90), '1h30');
  assert.equal(formatarDuracao(160), '2h40');
  assert.equal(formatarDuracao(125), '2h05');
});

test('os botões iniciais lembram do que a IA faz de novo, por tipo de usuário', () => {
  assert.ok(sugestoesIniciais(true).includes('Registrar o horário de alguém'));
  assert.ok(sugestoesIniciais(false).includes('Corrigir um horário de ontem'));
  assert.ok(!sugestoesIniciais(false).includes('Registrar o horário de alguém'), 'registrar é do gestor');
  assert.equal(sugestoesIniciais(true).length, 4);
  assert.equal(sugestoesIniciais(false).length, 4);
});

test('depois de confirmar um cartão os botões seguem o que aconteceu, e o gestor ganha o registro de horário', () => {
  const dev = sugestoesAposProposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, false);
  const gestor = sugestoesAposProposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, true);
  assert.ok(dev.includes('Começar essa atividade') && gestor.includes('Começar essa atividade'));
  assert.ok(gestor.includes('Registrar o horário dessa atividade'));
  assert.ok(!dev.includes('Registrar o horário dessa atividade'));
  assert.deepEqual(sugestoesAposProposta(TipoPropostaIaEnum.INICIAR_EXECUCAO, StatusPropostaIaEnum.AJUSTADA, false), ['Pausar essa execução', 'Vou almoçar', 'Trocar para outra atividade']);
});

test('o desenvolvedor não recebe como próximo passo o que só o gestor consegue fazer', () => {
  const soDoGestor = ['Marcar tags nessa demanda', 'Criar uma atividade para ele', 'Conectar essa demanda a outra', 'Descrever essa demanda', 'Marcar outra demanda', 'Registrar o horário dessa atividade', 'Quanto tempo o projeto consumiu este mês?'];
  for (const tipo of Object.values(TipoPropostaIaEnum)) {
    const dev = sugestoesAposProposta(tipo, StatusPropostaIaEnum.CONFIRMADA, false);
    for (const botao of dev) assert.ok(!soDoGestor.includes(botao), `${tipo}: "${botao}" é do gestor`);
  }
});

test('recusar, desfazer ou expirar não abrem próximo passo, e há no máximo quatro botões', () => {
  for (const status of [StatusPropostaIaEnum.EXPIRADA, StatusPropostaIaEnum.DESFEITA, StatusPropostaIaEnum.PENDENTE]) {
    assert.deepEqual(sugestoesAposProposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, status, true), []);
  }
  for (const tipo of Object.values(TipoPropostaIaEnum)) {
    assert.ok(sugestoesAposProposta(tipo, StatusPropostaIaEnum.CONFIRMADA, true).length <= 4);
  }
});

test('mensagemInicialDoLink apara o texto, tolera ausência e respeita o limite do campo', () => {
  assert.equal(mensagemInicialDoLink('  De onde paramos?  '), 'De onde paramos?');
  assert.equal(mensagemInicialDoLink(null), '');
  assert.equal(mensagemInicialDoLink(undefined), '');
  assert.equal(mensagemInicialDoLink('   '), '');
  assert.equal(mensagemInicialDoLink('a'.repeat(LIMITE_MENSAGEM_CHAT + 10)).length, LIMITE_MENSAGEM_CHAT);
});
