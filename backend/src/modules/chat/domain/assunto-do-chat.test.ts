import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AssuntoChatEnum, AutorChatEnum, ContextoChatEnum, ModoContextoChatEnum } from '@project20/shared';
import {
  assuntoDaMensagem,
  assuntoDaUltimaMarcada,
  CARACTERES_POR_MENSAGEM_PARA_CLASSIFICAR,
  filtrarHistoricoPorModo,
  INSTRUCOES_SO_PROJECT,
  interpretarAssunto,
  MENSAGENS_PARA_CLASSIFICAR,
  montarInstrucoesDaConversa,
  montarPedidoDeAssunto,
} from './assunto-do-chat';
import { ChatMensagemLida } from './chat-mensagem.documento';

function mensagem(autor: AutorChatEnum, texto: string, assunto: AssuntoChatEnum | null = null): ChatMensagemLida {
  return {
    id: texto, conversaId: '7-2026-10-19', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor, assunto, texto, nivel: null, modelo: null,
    tokensEntrada: null, tokensSaida: null, tokensCache: null, propostaIds: [], execucaoId: null, atividadeId: null, demandaId: null,
    conteudoBruto: null, createdDate: new Date('2026-10-19T12:00:00Z'),
  };
}

const { USUARIO, IA, SISTEMA } = AutorChatEnum;
const { CODIGO } = AssuntoChatEnum;

test('assuntoDaMensagem: sem marca conta como SISTEMA', () => {
  assert.equal(assuntoDaMensagem({ assunto: null }), AssuntoChatEnum.SISTEMA);
  assert.equal(assuntoDaMensagem({ assunto: CODIGO }), CODIGO);
});

test('assuntoDaUltimaMarcada: a última mensagem com marca, ou SISTEMA se nenhuma tem', () => {
  assert.equal(assuntoDaUltimaMarcada([]), AssuntoChatEnum.SISTEMA);
  assert.equal(assuntoDaUltimaMarcada([mensagem(USUARIO, 'a'), mensagem(IA, 'b')]), AssuntoChatEnum.SISTEMA);
  assert.equal(assuntoDaUltimaMarcada([mensagem(USUARIO, 'a', CODIGO), mensagem(IA, 'b', CODIGO), mensagem(SISTEMA, 'erro')]), CODIGO);
  assert.equal(assuntoDaUltimaMarcada([mensagem(USUARIO, 'a', CODIGO), mensagem(USUARIO, 'b', AssuntoChatEnum.SISTEMA)]), AssuntoChatEnum.SISTEMA);
});

test('interpretarAssunto lê a palavra, ignora caixa, acento e pontuação, e recusa o que não é claro', () => {
  assert.equal(interpretarAssunto('CODIGO'), CODIGO);
  assert.equal(interpretarAssunto('  código.\n'), CODIGO);
  assert.equal(interpretarAssunto('sistema'), AssuntoChatEnum.SISTEMA);
  assert.equal(interpretarAssunto('"SISTEMA"'), AssuntoChatEnum.SISTEMA);
  assert.equal(interpretarAssunto(''), null);
  assert.equal(interpretarAssunto('talvez'), null);
  assert.equal(interpretarAssunto('SISTEMA ou CODIGO'), null);
});

test('montarPedidoDeAssunto: as últimas mensagens de conversa, cortadas, e a pergunta atual; sistema não entra', () => {
  const historico = [
    mensagem(USUARIO, 'primeira'),
    mensagem(IA, 'segunda'),
    mensagem(SISTEMA, 'erro de rede'),
    mensagem(USUARIO, 'terceira'),
    mensagem(IA, 'quarta'),
    mensagem(USUARIO, 'quinta'),
  ];
  const pedido = montarPedidoDeAssunto(historico, 'e em C#?');
  assert.ok(pedido.endsWith('Pergunta atual: e em C#?'));
  assert.equal(pedido.includes('erro de rede'), false);
  assert.equal(pedido.includes('primeira'), false, `só as últimas ${MENSAGENS_PARA_CLASSIFICAR}`);
  assert.ok(pedido.includes('Usuário: quinta') && pedido.includes('IA: quarta') && pedido.includes('IA: segunda'));
  assert.equal(montarPedidoDeAssunto([], 'oi'), 'Pergunta atual: oi');
  const longa = montarPedidoDeAssunto([mensagem(USUARIO, 'x'.repeat(CARACTERES_POR_MENSAGEM_PARA_CLASSIFICAR + 100))], 'p');
  assert.equal(longa.includes('x'.repeat(CARACTERES_POR_MENSAGEM_PARA_CLASSIFICAR + 1)), false);
});

test('filtrarHistoricoPorModo: MISTURADO devolve tudo; SEPARADO só o assunto atual, com SISTEMA para quem não tem marca', () => {
  const historico = [
    mensagem(USUARIO, 'atividades?'),
    mensagem(IA, 'duas'),
    mensagem(USUARIO, 'loop em PHP?', CODIGO),
    mensagem(IA, 'foreach', CODIGO),
    mensagem(USUARIO, 'e a execução?', AssuntoChatEnum.SISTEMA),
  ];
  assert.equal(filtrarHistoricoPorModo(historico, ModoContextoChatEnum.MISTURADO, CODIGO), historico);
  assert.deepEqual(filtrarHistoricoPorModo(historico, ModoContextoChatEnum.SEPARADO, CODIGO).map((m) => m.texto), ['loop em PHP?', 'foreach']);
  assert.deepEqual(
    filtrarHistoricoPorModo(historico, ModoContextoChatEnum.SEPARADO, AssuntoChatEnum.SISTEMA).map((m) => m.texto),
    ['atividades?', 'duas', 'e a execução?'],
  );
});

test('montarInstrucoesDaConversa: ligado soma o prompt DUVIDA_CODIGO; desligado, a recusa fixa', () => {
  assert.equal(montarInstrucoesDaConversa('CONVERSA', true, 'DUVIDA'), 'CONVERSA\n\nDUVIDA');
  assert.equal(montarInstrucoesDaConversa('CONVERSA', false, null), `CONVERSA\n\n${INSTRUCOES_SO_PROJECT}`);
  assert.equal(montarInstrucoesDaConversa('CONVERSA', false, 'DUVIDA'), `CONVERSA\n\n${INSTRUCOES_SO_PROJECT}`, 'desligado ignora o prompt de código');
  assert.match(INSTRUCOES_SO_PROJECT, /recuse com educação/);
});
