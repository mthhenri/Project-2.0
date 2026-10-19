import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { escolherExecutavelMaisNovo, lerExecutavelDoNome } from './executavel-do-desktop';

test('lerExecutavelDoNome aceita só Project-Desktop-<maior.menor.correcao>.exe', () => {
  assert.deepEqual(lerExecutavelDoNome('Project-Desktop-1.2.0.exe'), { nomeArquivo: 'Project-Desktop-1.2.0.exe', versao: '1.2.0' });
  for (const ruim of ['Project-Desktop-1.2.exe', 'project-desktop-1.2.0.exe', 'Project-Desktop-1.2.0.zip', '../Project-Desktop-1.2.0.exe', 'Project-Desktop-1.2.0.exe.bak', 'leia-me.txt', '']) {
    assert.equal(lerExecutavelDoNome(ruim), null, ruim);
  }
});

test('escolhe a maior versão pelos números, não pelo texto, e ignora o que não é executável do desktop', () => {
  const escolhido = escolherExecutavelMaisNovo(['leia-me.txt', 'Project-Desktop-1.9.0.exe', 'Project-Desktop-1.10.0.exe', 'Project-Desktop-1.2.0.exe', 'outro.exe']);
  assert.equal(escolhido?.nomeArquivo, 'Project-Desktop-1.10.0.exe');
  assert.equal(escolhido?.versao, '1.10.0');
});

test('sem nenhum executável com o nome esperado não há versão', () => {
  assert.equal(escolherExecutavelMaisNovo([]), null);
  assert.equal(escolherExecutavelMaisNovo(['leia-me.txt']), null);
});
