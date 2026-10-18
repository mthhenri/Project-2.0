import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EstadoIaEnum } from '@project20/shared';
import { destinoPosLogin } from './destino-pos-login';

test('com a IA no ar e sem retorno, o login cai no chat', () => {
  assert.equal(destinoPosLogin('/ponto', EstadoIaEnum.NO_AR), '/chat');
});

test('com a IA desligada, fora do ar ou sem resposta, o login cai em Atividades', () => {
  assert.equal(destinoPosLogin('/ponto', EstadoIaEnum.DESLIGADA), '/atividade');
  assert.equal(destinoPosLogin('/ponto', EstadoIaEnum.FORA_DO_AR), '/atividade');
  assert.equal(destinoPosLogin('/ponto', null), '/atividade');
});

test('um retorno válido sempre vence', () => {
  assert.equal(destinoPosLogin('/demanda/3', EstadoIaEnum.NO_AR), '/demanda/3');
  assert.equal(destinoPosLogin('/projeto', EstadoIaEnum.DESLIGADA), '/projeto');
});
