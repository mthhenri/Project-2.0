import { test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as assert from 'node:assert/strict';
import { FRASE_DA_FERRAMENTA, INSTRUCOES_DE_SUGESTOES, MAXIMO_DE_CARACTERES_DA_SUGESTAO, MAXIMO_DE_SUGESTOES, interpretarSugestoes, montarInstrucoesDeSugestoes } from './sugestoes';

test('lê um array JSON, com ou sem cercas de código', () => {
  assert.deepEqual(interpretarSugestoes('["Começar pela primeira", "Criar uma atividade"]'), ['Começar pela primeira', 'Criar uma atividade']);
  assert.deepEqual(interpretarSugestoes('```json\n["Sim", "Não"]\n```'), ['Sim', 'Não']);
  assert.deepEqual(interpretarSugestoes('Claro: ["Anotar no pad"] espero que ajude'), ['Anotar no pad']);
});

test('descarta o que não é texto válido, repetido ou grande demais, e limita a quantidade', () => {
  const longa = 'x'.repeat(MAXIMO_DE_CARACTERES_DA_SUGESTAO + 1);
  assert.deepEqual(interpretarSugestoes(JSON.stringify(['Sim', 'Sim', 7, null, longa, 'a', 'Talvez.'])), ['Sim', 'Talvez']);
  assert.equal(interpretarSugestoes(JSON.stringify(['a1', 'b2', 'c3', 'd4', 'e5', 'f6'])).length, MAXIMO_DE_SUGESTOES);
});

test('tira aspas e quebras; resposta que não é array vira vazio', () => {
  assert.deepEqual(interpretarSugestoes('["Criar a demanda \\"estrutura\\"", "Ver  as\\natividades"]'), ['Criar a demanda estrutura', 'Ver as atividades']);
  assert.deepEqual(interpretarSugestoes('não sei'), []);
  assert.deepEqual(interpretarSugestoes('{"a": 1}'), []);
  assert.deepEqual(interpretarSugestoes('[1, 2'), []);
});

test('a instrução lista só o que as ferramentas permitem e pede uma ação possível ainda não usada', () => {
  const instrucoes = montarInstrucoesDeSugestoes(['propor_registrar_execucao', 'propor_corrigir_execucao', 'ferramenta_sem_frase']);
  assert.ok(instrucoes.startsWith(INSTRUCOES_DE_SUGESTOES));
  assert.ok(instrucoes.includes(FRASE_DA_FERRAMENTA['propor_registrar_execucao']));
  assert.ok(instrucoes.includes(FRASE_DA_FERRAMENTA['propor_corrigir_execucao']));
  assert.ok(!instrucoes.includes(FRASE_DA_FERRAMENTA['propor_criar_projeto']));
  assert.ok(instrucoes.includes('Nunca sugira o que não está na lista'));
});

test('sem nenhuma ferramenta com frase, a instrução é a de sempre', () => {
  assert.equal(montarInstrucoesDeSugestoes([]), INSTRUCOES_DE_SUGESTOES);
  assert.equal(montarInstrucoesDeSugestoes(['ferramenta_sem_frase']), INSTRUCOES_DE_SUGESTOES);
});

test('toda frase aponta para uma ferramenta que existe no código (um nome errado nunca entraria na lista)', () => {
  const pastaDosModulos = path.resolve(__dirname, '../..');
  const nomes = new Set<string>();
  for (const arquivo of fs.readdirSync(pastaDosModulos, { recursive: true }) as string[]) {
    if (!/\.ts$/.test(arquivo) || /\.test\.ts$/.test(arquivo)) continue;
    const texto = fs.readFileSync(path.join(pastaDosModulos, arquivo), 'utf8');
    for (const achado of texto.matchAll(/readonly nome = '([a-z_]+)'/g)) nomes.add(achado[1]);
  }
  assert.ok(nomes.size > 20, 'deveria ter achado as ferramentas do projeto');
  for (const nome of Object.keys(FRASE_DA_FERRAMENTA)) assert.ok(nomes.has(nome), `ferramenta inexistente na lista de frases: ${nome}`);
});
