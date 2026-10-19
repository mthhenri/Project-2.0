import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoAnotacaoEnum } from '@project20/shared';
import { SecaoAnotacao } from './secao-anotacao';

const lida = (texto: string, updatedDate = new Date('2026-01-15T12:00:00Z')) =>
  ({ id: 1, usuarioId: 7, tipo: TipoAnotacaoEnum.LEMBRETE, texto, updatedDate });

test('nasce com o texto, a versão e o estado lidos do servidor', () => {
  const secao = new SecaoAnotacao(7, TipoAnotacaoEnum.LEMBRETE, lida('avisar'));
  assert.equal(secao.usuarioId, 7);
  assert.equal(secao.textoAtual, 'avisar');
  assert.equal(secao.conteudoSalvo, 'avisar');
  assert.equal(secao.controle.value, 'avisar');
  assert.equal(secao.temTexto(), true);
  assert.equal(secao.estado(), 'ocioso');
  assert.equal(secao.limpando, false);
});

test('seção só com espaços não conta como texto', () => {
  assert.equal(new SecaoAnotacao(7, TipoAnotacaoEnum.LEMBRETE, lida('  \n ')).temTexto(), false);
});

test('adotar troca texto, versão e "tem texto" pela versão do servidor', () => {
  const secao = new SecaoAnotacao(7, TipoAnotacaoEnum.LEMBRETE, lida('antigo'));
  secao.controle.setValue('digitado e perdido');
  const nova = new Date('2026-01-16T09:00:00Z');
  secao.adotar(lida('', nova));
  assert.equal(secao.textoAtual, '');
  assert.equal(secao.conteudoSalvo, '');
  assert.equal(secao.versaoLida, nova);
  assert.equal(secao.temTexto(), false);
});

test('limpando vale enquanto há conteúdo guardado para o Desfazer', () => {
  const secao = new SecaoAnotacao(7, TipoAnotacaoEnum.LEMBRETE, lida('x'));
  secao.conteudoAntesDeLimpar = 'x';
  assert.equal(secao.limpando, true);
  secao.conteudoAntesDeLimpar = '';
  assert.equal(secao.limpando, true, 'seção que já estava vazia ainda é uma limpeza em andamento');
  secao.conteudoAntesDeLimpar = null;
  assert.equal(secao.limpando, false);
});

test('encerrar apaga o salvamento agendado e solta a assinatura', async () => {
  const secao = new SecaoAnotacao(7, TipoAnotacaoEnum.LEMBRETE, lida('x'));
  let disparou = false;
  secao.temporizadorSalvar = setTimeout(() => (disparou = true), 5);
  let assinaturaEncerrada = false;
  secao.assinatura = { unsubscribe: () => (assinaturaEncerrada = true) } as never;

  secao.encerrar();
  await new Promise((resolver) => setTimeout(resolver, 20));
  assert.equal(disparou, false);
  assert.equal(secao.temporizadorSalvar, null);
  assert.equal(assinaturaEncerrada, true);
  assert.equal(secao.assinatura, null);
});
