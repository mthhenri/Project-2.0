import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { CHAVES_CONFIGURAVEIS_DE_NIVEL, PropostaIaNivelEnum, TIPOS_COM_NIVEL_FIXO } from '@project20/shared';
import { EXPLICACAO_DOS_NIVEIS, OPCOES_DE_NIVEL, REGRAS_DE_AUTONOMIA, REGRAS_FIXAS_DE_AUTONOMIA } from './autonomia.util';

test('o painel tem uma regra com texto para cada regra configurável do shared, na mesma ordem', () => {
  assert.deepEqual(REGRAS_DE_AUTONOMIA.map((regra) => regra.chave), [...CHAVES_CONFIGURAVEIS_DE_NIVEL]);
  for (const regra of REGRAS_DE_AUTONOMIA) {
    assert.notEqual(regra.rotulo.trim(), '', regra.chave);
    assert.notEqual(regra.descricao.trim(), '', `${regra.chave} precisa dizer o que cobre`);
  }
});

test('as regras fixas cobrem cada tipo fixo do shared e os dois casos de qualquer tipo, todas com o motivo do escudo', () => {
  assert.equal(REGRAS_FIXAS_DE_AUTONOMIA.length, TIPOS_COM_NIVEL_FIXO.length + 2);
  for (const regra of REGRAS_FIXAS_DE_AUTONOMIA) {
    assert.notEqual(regra.rotulo.trim(), '');
    assert.notEqual(regra.motivo.trim(), '', `${regra.rotulo} precisa explicar por que sempre pergunta`);
  }
  assert.ok(REGRAS_FIXAS_DE_AUTONOMIA.some((regra) => /outra pessoa/i.test(regra.rotulo)));
  assert.ok(REGRAS_FIXAS_DE_AUTONOMIA.some((regra) => /Pessoal/.test(regra.rotulo)));
});

test('só dois níveis se escolhem: o "sempre pergunta" é fixo e não está nas opções', () => {
  assert.deepEqual(OPCOES_DE_NIVEL.map((opcao) => opcao.valor), [PropostaIaNivelEnum.FAZ_E_AVISA, PropostaIaNivelEnum.PERGUNTA]);
  for (const nivel of Object.values(PropostaIaNivelEnum)) assert.notEqual(EXPLICACAO_DOS_NIVEIS[nivel].trim(), '');
});
