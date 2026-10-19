import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChatEventoDto } from '@project20/shared';
import { EventStreamResponse } from './event-stream.response';

// SYSTEM.SPEC.md §12 (`chat`): resposta `text/event-stream`, um evento por `data:`; os cabeçalhos só saem no primeiro evento (uma falha
// antes dele ainda responde com o status HTTP de erro) e escrever depois de o cliente fechar é ignorado, sem interromper a geração.

function criarResposta(estado: { writableEnded?: boolean; destroyed?: boolean } = {}) {
  const registro = { status: [] as number[], cabecalhos: {} as Record<string, string>, escritas: [] as string[], descarregou: 0, terminou: 0 };
  const resposta = {
    writableEnded: estado.writableEnded ?? false,
    destroyed: estado.destroyed ?? false,
    status(codigo: number) { registro.status.push(codigo); return resposta; },
    setHeader(nome: string, valor: string) { registro.cabecalhos[nome] = valor; },
    flushHeaders() { registro.descarregou++; },
    write(texto: string) { registro.escritas.push(texto); return true; },
    end() { registro.terminou++; resposta.writableEnded = true; },
  };
  return { resposta, registro };
}

const TRECHO: ChatEventoDto = { tipo: 'trecho', texto: 'Olá' };

test('o primeiro evento abre o fluxo: 200, text/event-stream, sem cache e sem buffer de proxy', () => {
  const { resposta, registro } = criarResposta();
  new EventStreamResponse(resposta as never).enviar(TRECHO);
  assert.deepEqual(registro.status, [200]);
  assert.equal(registro.cabecalhos['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.equal(registro.cabecalhos['Cache-Control'], 'no-cache, no-transform');
  assert.equal(registro.cabecalhos['Connection'], 'keep-alive');
  assert.equal(registro.cabecalhos['X-Accel-Buffering'], 'no');
  assert.equal(registro.descarregou, 1);
});

test('cada evento sai como uma linha `data:` com o JSON e uma linha em branco; os cabeçalhos só saem uma vez', () => {
  const { resposta, registro } = criarResposta();
  const fluxo = new EventStreamResponse(resposta as never);
  const eventos: ChatEventoDto[] = [
    TRECHO,
    { tipo: 'ferramenta', nome: 'listar_minhas_atividades', situacao: 'EXECUTANDO' },
    { tipo: 'proposta', propostaId: 9 },
    { tipo: 'sugestoes', itens: ['Sim', 'Não'] },
    { tipo: 'erro', mensagem: 'Falhou' },
  ];
  for (const evento of eventos) fluxo.enviar(evento);

  assert.deepEqual(registro.escritas, eventos.map((evento) => `data: ${JSON.stringify(evento)}\n\n`));
  assert.equal(registro.descarregou, 1);
  assert.deepEqual(registro.status, [200]);
});

test('acentos e quebras de linha no texto viajam dentro do JSON, sem partir o evento', () => {
  const { resposta, registro } = criarResposta();
  new EventStreamResponse(resposta as never).enviar({ tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' });
  assert.equal(registro.escritas.length, 1);
  assert.equal(registro.escritas[0].split('\n').length, 3);
  assert.deepEqual(JSON.parse(registro.escritas[0].slice('data: '.length)), { tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' });
});

test('cliente que fechou a conexão: escrever é ignorado e não lança (a geração continua)', () => {
  for (const estado of [{ writableEnded: true }, { destroyed: true }]) {
    const { resposta, registro } = criarResposta(estado);
    const fluxo = new EventStreamResponse(resposta as never);
    assert.doesNotThrow(() => fluxo.enviar(TRECHO));
    assert.doesNotThrow(() => fluxo.enviar(TRECHO));
    assert.deepEqual(registro.escritas, []);
  }
});

test('encerrar fecha o fluxo que começou; sem nenhum evento não toca na resposta (a exceção segue para o filtro de erros)', () => {
  const comEvento = criarResposta();
  const fluxo = new EventStreamResponse(comEvento.resposta as never);
  fluxo.enviar(TRECHO);
  fluxo.encerrar();
  fluxo.encerrar();
  assert.equal(comEvento.registro.terminou, 1);

  const semEvento = criarResposta();
  new EventStreamResponse(semEvento.resposta as never).encerrar();
  assert.equal(semEvento.registro.terminou, 0);
  assert.deepEqual(semEvento.registro.status, []);
});
