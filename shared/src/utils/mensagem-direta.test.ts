import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ReferenciaMensagemDiretaEnum } from '../enums/referencia-mensagem-direta.enum';
import {
  ATALHO_GLOBAL_PADRAO,
  DURACAO_DO_SILENCIO_DE_REUNIAO_MINUTOS,
  PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA,
  REGEX_ATALHO_GLOBAL,
  contemBlocoDeCodigo,
  estaSilenciado,
  formatarReferenciaDireta,
  lerConversaDiretaId,
  lerReferenciaDireta,
  montarConversaDiretaId,
  outroParticipanteDaConversaDireta,
  silenciarAteDeReuniao,
} from './mensagem-direta';

// --- conversa -------------------------------------------------------------

test('a conversa direta é <menor>-<maior> e o par cai na mesma conversa em qualquer ordem', () => {
  assert.equal(montarConversaDiretaId(9, 4), '4-9');
  assert.equal(montarConversaDiretaId(4, 9), '4-9');
  assert.equal(montarConversaDiretaId(10, 2), '2-10', 'ordena como número, não como texto');
});

test('montar a conversa recusa a mesma pessoa duas vezes e ids que não são inteiros positivos', () => {
  assert.throws(() => montarConversaDiretaId(4, 4), /duas pessoas diferentes/);
  for (const invalido of [0, -1, 1.5, Number.NaN, 2_147_483_648]) {
    assert.throws(() => montarConversaDiretaId(invalido, 3), /inteiros e positivos/, String(invalido));
    assert.throws(() => montarConversaDiretaId(3, invalido), /inteiros e positivos/, String(invalido));
  }
});

test('ler a conversa devolve os dois ids e recusa o que não é uma conversa direta', () => {
  assert.deepEqual(lerConversaDiretaId('4-9'), { usuarioMenorId: 4, usuarioMaiorId: 9 });
  for (const invalido of ['', '4', '9-4', '4-4', '0-3', '4-9-1', 'a-b', '4_9', '4-9 ', '-4-9', '1-2147483648', '7-2026-10-21']) {
    assert.equal(lerConversaDiretaId(invalido), null, JSON.stringify(invalido));
  }
  assert.equal(lerConversaDiretaId(undefined as unknown as string), null);
});

test('o outro participante vem do id de quem pergunta; quem não participa não tem "outro"', () => {
  assert.equal(outroParticipanteDaConversaDireta('4-9', 4), 9);
  assert.equal(outroParticipanteDaConversaDireta('4-9', 9), 4);
  assert.equal(outroParticipanteDaConversaDireta('4-9', 5), null);
  assert.equal(outroParticipanteDaConversaDireta('9-4', 4), null, 'conversa mal formada');
});

test('o que montar a conversa produz, ler devolve', () => {
  const participantes = lerConversaDiretaId(montarConversaDiretaId(31, 7));
  assert.deepEqual(participantes, { usuarioMenorId: 7, usuarioMaiorId: 31 });
});

// --- referências ----------------------------------------------------------

test('referência é guardada como TIPO:id e lida de volta', () => {
  assert.equal(formatarReferenciaDireta({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }), 'DEMANDA:212');
  assert.deepEqual(lerReferenciaDireta('ATIVIDADE:57'), { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 });
  assert.deepEqual(lerReferenciaDireta(formatarReferenciaDireta({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1 })), {
    tipo: ReferenciaMensagemDiretaEnum.DEMANDA,
    id: 1,
  });
});

test('ler a referência recusa tipo desconhecido, id inválido e formato errado', () => {
  for (const invalido of ['', 'DEMANDA', 'DEMANDA:', 'DEMANDA:0', 'DEMANDA:-3', 'DEMANDA:1.5', 'PROJETO:4', 'demanda:4', 'DEMANDA:4 ', 'DEMANDA:99999999999']) {
    assert.equal(lerReferenciaDireta(invalido), null, JSON.stringify(invalido));
  }
});

// --- silêncio -------------------------------------------------------------

const AGORA = new Date('2026-10-21T14:00:00Z');

test('o silêncio vale até o instante final, que já não vale', () => {
  assert.equal(estaSilenciado('2026-10-21T15:00:00Z', AGORA), true);
  assert.equal(estaSilenciado(new Date('2026-10-21T14:00:01Z'), AGORA), true);
  assert.equal(estaSilenciado('2026-10-21T14:00:00Z', AGORA), false, 'no instante exato os avisos voltam');
  assert.equal(estaSilenciado('2026-10-21T13:00:00Z', AGORA), false);
});

test('sem data, ou com data inválida, não há silêncio', () => {
  assert.equal(estaSilenciado(null, AGORA), false);
  assert.equal(estaSilenciado(undefined, AGORA), false);
  assert.equal(estaSilenciado('', AGORA), false);
  assert.equal(estaSilenciado('não é data', AGORA), false);
});

test('silenciar para reunião é uma hora a partir de agora', () => {
  assert.equal(DURACAO_DO_SILENCIO_DE_REUNIAO_MINUTOS, 60);
  assert.equal(silenciarAteDeReuniao(AGORA).toISOString(), '2026-10-21T15:00:00.000Z');
  assert.equal(estaSilenciado(silenciarAteDeReuniao(AGORA), AGORA), true);
});

// --- bloco de código ------------------------------------------------------

test('bloco de código cercado conta, com ou sem linguagem', () => {
  assert.equal(contemBlocoDeCodigo('Vi isso ontem:\n\n```ts\nthis.filtro.set(\'\');\n```'), true);
  assert.equal(contemBlocoDeCodigo('```\nselect 1\n```'), true);
});

test('bloco de código dentro de uma citação também conta', () => {
  assert.equal(contemBlocoDeCodigo('> olha isso\n>\n> ```js\n> run()\n> ```'), true);
});

test('código em linha, texto comum e texto vazio não contam', () => {
  assert.equal(contemBlocoDeCodigo('Troque o `ngOnInit` por um effect.'), false);
  assert.equal(contemBlocoDeCodigo('Bom dia, tudo bem?'), false);
  assert.equal(contemBlocoDeCodigo(''), false);
  assert.equal(contemBlocoDeCodigo(undefined as unknown as string), false);
});

// --- atalho e preferência padrão -------------------------------------------

test('o atalho global exige modificador e tecla', () => {
  for (const valido of ['Ctrl+Shift+Space', 'Alt+F1', 'CommandOrControl+Shift+K', 'Super+1', ATALHO_GLOBAL_PADRAO]) {
    assert.match(valido, REGEX_ATALHO_GLOBAL, valido);
  }
  for (const invalido of ['', 'K', 'Space', 'Ctrl', 'Ctrl+', 'Ctrl+Shift', '+K', 'Ctrl++K', 'Ctrl+Shift+Espaço', 'ctrl+k', 'Ctrl+K ', 'Ctrl+K+Shift']) {
    assert.doesNotMatch(invalido, REGEX_ATALHO_GLOBAL, JSON.stringify(invalido));
  }
});

test('a preferência padrão é válida e não silencia ninguém', () => {
  assert.equal(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.avisosAtivos, true);
  assert.equal(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.avisoDesktopAtivo, true);
  assert.equal(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.somAtivo, false);
  assert.equal(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.silenciadoAteDate, null);
  assert.match(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.atalhoGlobal, REGEX_ATALHO_GLOBAL);
});
