import { test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert/strict';
import * as enums from './index';
import { NIVEL_DO_TIPO_DE_PROMPT } from '../utils/nivel-do-tipo-de-prompt';
import { TipoPromptEnum } from './tipo-prompt.enum';
import { NivelIaEnum } from './nivel-ia.enum';

// Convenção (SYSTEM.SPEC.md §5.4): todo enum é string enum, com valores SCREAMING_SNAKE_CASE iguais aos nomes.
const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

// O índice também exporta constantes auxiliares (ex.: TIPOS_ANOTACAO_ORDENADOS); enum é o que termina em Enum.
const enumeracoes = (Object.entries(enums) as Array<[string, Record<string, string>]>).filter(([nome]) => /Enum$/.test(nome));

test('o índice exporta os enums', () => {
  assert.ok(enumeracoes.length >= 20);
  for (const [nome, enumeracao] of enumeracoes) {
    assert.equal(typeof enumeracao, 'object', nome);
  }
});

for (const [nome, enumeracao] of enumeracoes) {
  test(`${nome} é string enum com valores SCREAMING_SNAKE_CASE iguais aos nomes`, () => {
    const chaves = Object.keys(enumeracao);
    assert.ok(chaves.length > 0, 'enum vazio');
    for (const chave of chaves) {
      assert.equal(typeof enumeracao[chave], 'string', `${nome}.${chave} não é string (enum numérico?)`);
      assert.equal(enumeracao[chave], chave, `${nome}.${chave} deveria valer "${chave}"`);
      assert.match(chave, SCREAMING_SNAKE_CASE, `${nome}.${chave} fora de SCREAMING_SNAKE_CASE`);
    }
  });
}

test('todo arquivo *.enum.ts está exportado pelo índice', () => {
  const indice = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const arquivos = fs.readdirSync(__dirname).filter((arquivo) => arquivo.endsWith('.enum.ts'));
  assert.ok(arquivos.length >= 20);
  for (const arquivo of arquivos) {
    assert.ok(indice.includes('./' + arquivo.replace(/.ts$/, '')), arquivo + ' fora do index.ts');
  }
});

test('todo tipo de prompt tem nível, e o nível é um NivelIaEnum válido', () => {
  const niveisValidos = new Set<string>(Object.values(NivelIaEnum));
  for (const tipo of Object.values(TipoPromptEnum)) {
    assert.ok(tipo in NIVEL_DO_TIPO_DE_PROMPT, `${tipo} sem nível`);
    assert.ok(niveisValidos.has(NIVEL_DO_TIPO_DE_PROMPT[tipo]), `${tipo} com nível inválido`);
  }
  assert.deepEqual(Object.keys(NIVEL_DO_TIPO_DE_PROMPT).sort(), Object.values(TipoPromptEnum).sort(), 'nível para tipo que não existe');
});
