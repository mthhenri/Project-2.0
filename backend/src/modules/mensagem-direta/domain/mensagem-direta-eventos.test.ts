import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum, MensagemDiretaEventoDto, MensagemDiretaResumoDto } from '@project20/shared';
import { ConexoesDeEventosDiretos } from './conexoes-de-eventos-diretos';
import {
  codificarMensagemDoBarramento,
  decodificarMensagemDoBarramento,
  LIMITE_DO_NOTIFY_EM_BYTES,
  MensagemDoBarramento,
  prepararParaNotify,
} from './mensagem-direta-barramento';
import { diferencaDePresenca, PresencaGlobal } from './presenca-global';

function mensagem(texto = 'oi'): MensagemDiretaResumoDto {
  return {
    mensagemId: '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10',
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: 4,
    texto,
    contemCodigo: false,
    mencoes: [9],
    referencias: [],
    createdDate: new Date('2026-10-21T14:05:11.482Z'),
  };
}

// --- barramento -------------------------------------------------------------

test('barramento: a mensagem de uma ENTREGA volta com a data como Date, e o resto igual', () => {
  const original: MensagemDoBarramento = { tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'MENSAGEM', mensagem: mensagem('com acento: ação') } };
  const lida = decodificarMensagemDoBarramento(codificarMensagemDoBarramento(original));
  assert.deepEqual(lida, original);
  assert.ok(lida?.tipo === 'ENTREGA' && lida.evento.tipo === 'MENSAGEM' && lida.evento.mensagem.createdDate instanceof Date);
});

test('barramento: LEITURA volta com Date; os eventos sem data e a PRESENCA passam como estão', () => {
  const leitura: MensagemDoBarramento = { tipo: 'ENTREGA', usuarioIds: [4], evento: { tipo: 'LEITURA', conversaId: '4-9', usuarioId: 9, lidaAteDate: new Date('2026-10-21T15:00:00.000Z') } };
  assert.deepEqual(decodificarMensagemDoBarramento(codificarMensagemDoBarramento(leitura)), leitura);

  const eventos: MensagemDiretaEventoDto[] = [
    { tipo: 'SINCRONIZAR', conversaId: null },
    { tipo: 'PRESENCA', usuarioId: 4, online: true },
    { tipo: 'DIGITANDO', conversaId: '4-9', usuarioId: 4 },
    { tipo: 'BATIMENTO' },
    { tipo: 'ENCERRANDO' },
    { tipo: 'ABERTURA', onlineUsuarioIds: [1, 2] },
  ];
  for (const evento of eventos) {
    const entrega: MensagemDoBarramento = { tipo: 'ENTREGA', usuarioIds: [1], evento };
    assert.deepEqual(decodificarMensagemDoBarramento(codificarMensagemDoBarramento(entrega)), entrega);
  }
  const presenca: MensagemDoBarramento = { tipo: 'PRESENCA', instanciaId: 'abc', usuarioIds: [1, 2] };
  assert.deepEqual(decodificarMensagemDoBarramento(codificarMensagemDoBarramento(presenca)), presenca);
});

test('barramento: carga inválida devolve null em vez de derrubar a escuta', () => {
  for (const texto of ['não é json', 'null', '[]', '{"tipo":"X"}', '{"tipo":"ENTREGA","usuarioIds":["a"],"evento":{"tipo":"BATIMENTO"}}',
    '{"tipo":"ENTREGA","usuarioIds":[1],"evento":{"tipo":"MENSAGEM","mensagem":{"createdDate":"ontem"}}}',
    '{"tipo":"ENTREGA","usuarioIds":[1],"evento":{"tipo":"DESCONHECIDO"}}', '{"tipo":"PRESENCA","instanciaId":1,"usuarioIds":[]}']) {
    assert.equal(decodificarMensagemDoBarramento(texto), null, texto);
  }
});

test('prepararParaNotify: a mensagem que cabe vai inteira; a que passa de 7.500 bytes vira SINCRONIZAR da conversa, nunca truncada', () => {
  const pequena: MensagemDoBarramento = { tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'MENSAGEM', mensagem: mensagem() } };
  assert.equal(prepararParaNotify(pequena), codificarMensagemDoBarramento(pequena));

  const grande: MensagemDoBarramento = { tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'MENSAGEM', mensagem: mensagem('ç'.repeat(10_000)) } };
  const carga = prepararParaNotify(grande);
  assert.ok(Buffer.byteLength(carga, 'utf8') <= LIMITE_DO_NOTIFY_EM_BYTES);
  assert.deepEqual(decodificarMensagemDoBarramento(carga), { tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'SINCRONIZAR', conversaId: '4-9' } });
});

test('prepararParaNotify: o limite é em BYTES (acento conta dois), e o que não pode encolher é erro', () => {
  const nasFronteiras = (caracteres: number) => prepararParaNotify({ tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'MENSAGEM', mensagem: mensagem('é'.repeat(caracteres)) } });
  assert.equal(decodificarMensagemDoBarramento(nasFronteiras(3_000))?.tipo, 'ENTREGA');
  assert.equal((decodificarMensagemDoBarramento(nasFronteiras(4_000)) as { evento: { tipo: string } }).evento.tipo, 'SINCRONIZAR');

  assert.throws(
    () => prepararParaNotify({ tipo: 'PRESENCA', instanciaId: 'x', usuarioIds: Array.from({ length: 5_000 }, (_, i) => 1_000_000 + i) }),
    /não cabe no barramento/,
  );
});

// --- presença ----------------------------------------------------------------

test('PresencaGlobal: online é a união das instâncias, e a que para de publicar expira sozinha', () => {
  let agora = 1_000;
  const presenca = new PresencaGlobal(75_000, () => agora);
  presenca.atualizarInstancia('a', [1, 2]);
  presenca.atualizarInstancia('b', [2, 3]);
  assert.deepEqual([...presenca.online()].sort(), [1, 2, 3]);

  agora += 50_000;
  presenca.atualizarInstancia('b', [3]);
  agora += 30_000; // 'a' não publica há 80 s: caiu
  assert.deepEqual([...presenca.online()].sort(), [3]);

  presenca.removerInstancia('b');
  assert.deepEqual([...presenca.online()], []);
});

test('PresencaGlobal: o conjunto novo de uma instância substitui o anterior', () => {
  const presenca = new PresencaGlobal(75_000, () => 0);
  presenca.atualizarInstancia('a', [1, 2]);
  presenca.atualizarInstancia('a', [2]);
  assert.deepEqual([...presenca.online()], [2]);
});

test('diferencaDePresenca: quem entrou e quem saiu, em ordem de usuário', () => {
  assert.deepEqual(diferencaDePresenca(new Set([1, 2, 5]), new Set([2, 3, 4])), [
    { usuarioId: 1, online: false },
    { usuarioId: 3, online: true },
    { usuarioId: 4, online: true },
    { usuarioId: 5, online: false },
  ]);
  assert.deepEqual(diferencaDePresenca(new Set([1]), new Set([1])), []);
});

// --- conexões locais ----------------------------------------------------------

function conexaoFalsa() {
  const recebidos: MensagemDiretaEventoDto[] = [];
  let encerrada = false;
  return { recebidos, get encerrada() { return encerrada; }, enviar: (evento: MensagemDiretaEventoDto) => { recebidos.push(evento); }, encerrar: () => { encerrada = true; } };
}

test('ConexoesDeEventosDiretos: entrega só a quem está conectado, a todas as abas, sem repetir usuário', () => {
  const registro = new ConexoesDeEventosDiretos();
  const abaUm = conexaoFalsa();
  const abaDois = conexaoFalsa();
  const outra = conexaoFalsa();
  registro.adicionar(4, abaUm);
  registro.adicionar(4, abaDois);
  registro.adicionar(9, outra);

  registro.entregar([4, 4, 77], { tipo: 'BATIMENTO' });
  assert.equal(abaUm.recebidos.length, 1);
  assert.equal(abaDois.recebidos.length, 1);
  assert.equal(outra.recebidos.length, 0);
  assert.deepEqual(registro.usuariosConectados(), [4, 9]);

  registro.entregarATodos({ tipo: 'ENCERRANDO' });
  assert.equal(outra.recebidos.length, 1);
});

test('ConexoesDeEventosDiretos: remover uma aba mantém o usuário conectado até a última sair (idempotente)', () => {
  const registro = new ConexoesDeEventosDiretos();
  const removerUm = registro.adicionar(4, conexaoFalsa());
  const removerDois = registro.adicionar(4, conexaoFalsa());
  removerUm();
  removerUm();
  assert.deepEqual(registro.usuariosConectados(), [4]);
  removerDois();
  assert.deepEqual(registro.usuariosConectados(), []);
});

test('ConexoesDeEventosDiretos: conexão que falha ao receber é descartada e as demais continuam recebendo', () => {
  const registro = new ConexoesDeEventosDiretos();
  const boa = conexaoFalsa();
  registro.adicionar(4, { enviar: () => { throw new Error('socket fechado'); }, encerrar: () => undefined });
  registro.adicionar(4, boa);

  registro.entregar([4], { tipo: 'BATIMENTO' });
  registro.entregar([4], { tipo: 'BATIMENTO' });
  assert.equal(boa.recebidos.length, 2);
});

test('ConexoesDeEventosDiretos: encerrarTodas fecha tudo, mesmo se uma conexão já estava fechada', () => {
  const registro = new ConexoesDeEventosDiretos();
  const normal = conexaoFalsa();
  registro.adicionar(4, { enviar: () => undefined, encerrar: () => { throw new Error('já fechada'); } });
  registro.adicionar(9, normal);
  registro.encerrarTodas();
  assert.equal(normal.encerrada, true);
  assert.deepEqual(registro.usuariosConectados(), []);
});
