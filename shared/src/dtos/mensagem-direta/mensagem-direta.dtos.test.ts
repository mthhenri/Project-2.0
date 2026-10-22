import 'reflect-metadata';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  LIMITE_MAXIMO_DA_CONVERSA_DIRETA,
  LIMITE_MENCOES_MENSAGEM_DIRETA,
  LIMITE_REFERENCIAS_MENSAGEM_DIRETA,
  LIMITE_TEXTO_MENSAGEM_DIRETA,
} from '../../utils/mensagem-direta';
import { MensagemDiretaBuscarDto } from './MensagemDiretaBuscarDto';
import { MensagemDiretaEnviarDto } from './MensagemDiretaEnviarDto';
import { MensagemDiretaLeituraAlterarDto } from './MensagemDiretaLeituraAlterarDto';
import { MensagemDiretaListarDto } from './MensagemDiretaListarDto';
import { MensagemDiretaPreferenciaAlterarDto } from './MensagemDiretaPreferenciaAlterarDto';
import { MensagemDiretaSilencioAlterarDto } from './MensagemDiretaSilencioAlterarDto';

// O ValidationPipe do backend roda com whitelist + forbidNonWhitelisted + transform (main.ts, SYSTEM.SPEC.md §10).
const OPCOES_DO_PIPE = { whitelist: true, forbidNonWhitelisted: true };

type Construtor<T> = new () => T;

async function erros<T extends object>(classe: Construtor<T>, carga: Record<string, unknown>): Promise<string[]> {
  const resultado = await validate(plainToInstance(classe, carga), OPCOES_DO_PIPE);
  return resultado.map((erro) => erro.property).sort();
}

const UUID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';
const ENVIO_VALIDO = { destinatarioId: 9, mensagemId: UUID, texto: 'Consegue olhar isso?' };

// --- MensagemDiretaEnviarDto -------------------------------------------------

test('enviar: o mínimo (destinatário, id do cliente e texto) é válido; menções e referências são opcionais', async () => {
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, ENVIO_VALIDO), []);
  assert.deepEqual(
    await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mencoes: [4, 5], referencias: [{ tipo: 'DEMANDA', id: 212 }, { tipo: 'ATIVIDADE', id: 57 }] }),
    [],
  );
});

test('enviar: aceita código colado, com os caracteres que o validador de nomes proíbe', async () => {
  const codigo = "```ts\nconst total = execucoes.filter((e) => !e.fimData); // <b>ok</b> & \"aspas\"\n```";
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, texto: codigo }), []);
});

test('enviar: recusa destinatário inválido e id de cliente que não é UUID v4', async () => {
  for (const destinatarioId of [0, -1, 1.5, '9', null]) {
    assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, destinatarioId }), ['destinatarioId'], String(destinatarioId));
  }
  for (const mensagemId of ['', 'abc', '7f0c2b9e-4c1a-1e6a-9d55-2f6c0d1b8a10', 123, null]) {
    assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mensagemId }), ['mensagemId'], String(mensagemId));
  }
});

test('enviar: recusa texto vazio, só espaços e acima do limite; o limite exato vale', async () => {
  for (const texto of ['', '   ', '\n\t', 42, null]) {
    assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, texto }), ['texto'], JSON.stringify(texto));
  }
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, texto: 'a'.repeat(LIMITE_TEXTO_MENSAGEM_DIRETA) }), []);
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, texto: 'a'.repeat(LIMITE_TEXTO_MENSAGEM_DIRETA + 1) }), ['texto']);
});

test('enviar: recusa menções e referências inválidas ou em excesso', async () => {
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mencoes: [0] }), ['mencoes']);
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mencoes: ['a'] }), ['mencoes']);
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mencoes: 4 }), ['mencoes']);
  assert.deepEqual(
    await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, mencoes: Array.from({ length: LIMITE_MENCOES_MENSAGEM_DIRETA + 1 }, (_, indice) => indice + 1) }),
    ['mencoes'],
  );
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, referencias: [{ tipo: 'PROJETO', id: 3 }] }), ['referencias']);
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, referencias: [{ tipo: 'DEMANDA', id: 0 }] }), ['referencias']);
  assert.deepEqual(
    await erros(MensagemDiretaEnviarDto, {
      ...ENVIO_VALIDO,
      referencias: Array.from({ length: LIMITE_REFERENCIAS_MENSAGEM_DIRETA + 1 }, () => ({ tipo: 'DEMANDA', id: 1 })),
    }),
    ['referencias'],
  );
});

test('enviar: autor e conversa não vêm do corpo (campo fora do DTO é recusado)', async () => {
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, autorUsuarioId: 1 }), ['autorUsuarioId']);
  assert.deepEqual(await erros(MensagemDiretaEnviarDto, { ...ENVIO_VALIDO, conversaId: '1-9' }), ['conversaId']);
});

// --- MensagemDiretaListarDto ---------------------------------------------------

test('listar: sem parâmetros é válido; o limite chega da query como texto e vira número', async () => {
  assert.deepEqual(await erros(MensagemDiretaListarDto, {}), []);
  const instancia = plainToInstance(MensagemDiretaListarDto, { limite: '25', cursor: 'abc' });
  assert.equal(instancia.limite, 25);
  assert.deepEqual(await erros(MensagemDiretaListarDto, { limite: '25', cursor: 'abc' }), []);
});

test('listar: recusa limite fora de 1 a 100 ou que não é número, e cursor longo demais', async () => {
  for (const limite of ['0', '-1', String(LIMITE_MAXIMO_DA_CONVERSA_DIRETA + 1), '1.5', 'muitas']) {
    assert.deepEqual(await erros(MensagemDiretaListarDto, { limite }), ['limite'], limite);
  }
  assert.deepEqual(await erros(MensagemDiretaListarDto, { limite: String(LIMITE_MAXIMO_DA_CONVERSA_DIRETA) }), []);
  assert.deepEqual(await erros(MensagemDiretaListarDto, { cursor: 'x'.repeat(121) }), ['cursor']);
});

test('listar: a pessoa da rota não vem da query', async () => {
  assert.deepEqual(await erros(MensagemDiretaListarDto, { usuarioId: 9 }), ['usuarioId']);
});

// --- MensagemDiretaBuscarDto ---------------------------------------------------

test('buscar: texto é obrigatório; período e filtro de código são opcionais', async () => {
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, { texto: 'filtro' }), []);
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, { texto: 'filtro', inicio: '2026-10-01', fim: '2026-10-21T10:00:00Z', somenteCodigo: 'true' }), []);
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, { texto: '' }), ['texto']);
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, {}), ['texto']);
});

test('buscar: o filtro de código chega da query como texto e vira booleano', async () => {
  assert.equal(plainToInstance(MensagemDiretaBuscarDto, { texto: 'a', somenteCodigo: 'true' }).somenteCodigo, true);
  assert.equal(plainToInstance(MensagemDiretaBuscarDto, { texto: 'a', somenteCodigo: 'false' }).somenteCodigo, false);
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, { texto: 'a', somenteCodigo: 'talvez' }), ['somenteCodigo']);
  assert.deepEqual(await erros(MensagemDiretaBuscarDto, { texto: 'a', inicio: 'ontem' }), ['inicio']);
});

// --- MensagemDiretaLeituraAlterarDto e MensagemDiretaSilencioAlterarDto -----------

test('leitura: exige a data da última mensagem vista; a pessoa da rota não vem do corpo', async () => {
  assert.deepEqual(await erros(MensagemDiretaLeituraAlterarDto, { lidaAteDate: '2026-10-21T14:05:11.482Z' }), []);
  assert.deepEqual(await erros(MensagemDiretaLeituraAlterarDto, {}), ['lidaAteDate']);
  assert.deepEqual(await erros(MensagemDiretaLeituraAlterarDto, { lidaAteDate: 'agora' }), ['lidaAteDate']);
  assert.deepEqual(await erros(MensagemDiretaLeituraAlterarDto, { lidaAteDate: '2026-10-21T14:05:11Z', usuarioId: 9 }), ['usuarioId']);
});

test('silêncio: exige um booleano; a pessoa da rota não vem do corpo', async () => {
  assert.deepEqual(await erros(MensagemDiretaSilencioAlterarDto, { silenciada: true }), []);
  assert.deepEqual(await erros(MensagemDiretaSilencioAlterarDto, { silenciada: false }), []);
  assert.deepEqual(await erros(MensagemDiretaSilencioAlterarDto, { silenciada: 'sim' }), ['silenciada']);
  assert.deepEqual(await erros(MensagemDiretaSilencioAlterarDto, { silenciada: true, usuarioId: 9 }), ['usuarioId']);
});

// --- MensagemDiretaPreferenciaAlterarDto ---------------------------------------

const PREFERENCIA_VALIDA = {
  avisosAtivos: true,
  avisoDesktopAtivo: true,
  somAtivo: false,
  silenciadoAteDate: null,
  atalhoGlobal: 'Ctrl+Shift+Space',
};

test('preferência: o conjunto inteiro é válido, com ou sem silêncio', async () => {
  assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, PREFERENCIA_VALIDA), []);
  assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, { ...PREFERENCIA_VALIDA, silenciadoAteDate: '2026-10-21T15:00:00Z' }), []);
});

test('preferência: o pedido troca tudo, então campo faltando é recusado (inclusive o silêncio, que pode ser null mas não omitido)', async () => {
  for (const campo of Object.keys(PREFERENCIA_VALIDA)) {
    const { [campo]: _removido, ...semOCampo } = PREFERENCIA_VALIDA as Record<string, unknown>;
    assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, semOCampo), [campo], campo);
  }
});

test('preferência: recusa tipos errados, data de silêncio inválida e atalho que não tem modificador e tecla', async () => {
  assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, { ...PREFERENCIA_VALIDA, somAtivo: 'sim' }), ['somAtivo']);
  assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, { ...PREFERENCIA_VALIDA, silenciadoAteDate: 'amanhã' }), ['silenciadoAteDate']);
  for (const atalhoGlobal of ['K', 'Space', 'Ctrl', 'Ctrl+', '', 'Ctrl+' + 'a'.repeat(40)]) {
    assert.deepEqual(await erros(MensagemDiretaPreferenciaAlterarDto, { ...PREFERENCIA_VALIDA, atalhoGlobal }), ['atalhoGlobal'], atalhoGlobal);
  }
});

// --- busca de referências (task 211) ---------------------------------------------------------------

import { MensagemDiretaReferenciaBuscarDto } from './MensagemDiretaReferenciaBuscarDto';

test('MensagemDiretaReferenciaBuscarDto: aparar os espaços vem ANTES do mínimo de 2 letras', async () => {
  const validar = async (texto: unknown) => validate(plainToInstance(MensagemDiretaReferenciaBuscarDto, { texto }));
  assert.equal((await validar('  filtro ')).length, 0);
  assert.equal((await validar('fi')).length, 0);
  assert.ok((await validar('  ')).length > 0, 'só espaços não passa');
  assert.ok((await validar(' f ')).length > 0, 'uma letra com espaços em volta não passa');
  assert.ok((await validar('x'.repeat(101))).length > 0);
  assert.ok((await validar(undefined)).length > 0);
  assert.equal(plainToInstance(MensagemDiretaReferenciaBuscarDto, { texto: '  filtro ' }).texto, 'filtro');
});
