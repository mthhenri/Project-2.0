import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARACTERES_PROIBIDOS,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  removerCaracteresProibidos,
} from './caracteres-proibidos.validator';

test('aceita nomes sem caracteres proibidos, inclusive acentos e hífen', () => {
  for (const nome of ['Projeto Ação 2.0', 'Relatório - Mensal', 'tag_backend', '']) {
    assert.equal(REGEX_SEM_CARACTERES_PROIBIDOS.test(nome), true, nome);
  }
});

test('rejeita cada um dos caracteres proibidos em qualquer posição', () => {
  for (const caractere of CARACTERES_PROIBIDOS) {
    for (const texto of [`${caractere}inicio`, `meio${caractere}meio`, `fim${caractere}`]) {
      assert.equal(REGEX_SEM_CARACTERES_PROIBIDOS.test(texto), false, texto);
    }
  }
});

test('removerCaracteresProibidos limpa tudo e preserva o resto', () => {
  assert.equal(removerCaracteresProibidos(`a'b"c\`d~e^f\\g´h`), 'abcdefgh');
  assert.equal(removerCaracteresProibidos('texto normal'), 'texto normal');
});

test('o texto limpo sempre passa na regex (fonte única da classe de caracteres)', () => {
  const sujo = `${CARACTERES_PROIBIDOS}Nome${CARACTERES_PROIBIDOS}`;
  assert.equal(REGEX_SEM_CARACTERES_PROIBIDOS.test(removerCaracteresProibidos(sujo)), true);
});
