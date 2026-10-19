// Roda os testes do backend em dois grupos: unitários (`*.test.ts`, sem Docker) e de integração
// (`*.integracao.test.ts`, contra o PostgreSQL de teste). O `node --test` não exclui arquivos por
// glob, por isso a seleção é feita aqui. Uso: node scripts/executar-testes.mjs <unitarios|integracao> [--cobertura].
import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const grupo = process.argv[2];
const comCobertura = process.argv.includes('--cobertura');
if (grupo !== 'unitarios' && grupo !== 'integracao') {
  console.error('Uso: node scripts/executar-testes.mjs <unitarios|integracao>');
  process.exit(2);
}

const raizBackend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const eIntegracao = (arquivo) => arquivo.replaceAll(String.fromCharCode(92), '/').endsWith('.integracao.test.ts');
const arquivos = globSync('src/**/*.test.ts', { cwd: raizBackend })
  .filter((arquivo) => (grupo === 'integracao') === eIntegracao(arquivo))
  .sort();

if (arquivos.length === 0) {
  console.error(`Nenhum teste do grupo "${grupo}" encontrado.`);
  process.exit(grupo === 'integracao' ? 1 : 0);
}

if (grupo === 'integracao') {
  const preparo = spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', 'src/testes/preparar-banco-teste.ts'],
    { cwd: raizBackend, stdio: 'inherit' },
  );
  if (preparo.status !== 0) process.exit(preparo.status ?? 1);
}

const execucao = spawnSync(
  process.execPath,
  [
    '--require', 'ts-node/register', '--test',
    ...(comCobertura
      ? ['--experimental-test-coverage', '--test-reporter=lcov', '--test-reporter-destination=../.artifacts/cobertura/backend.lcov', '--test-reporter=spec', '--test-reporter-destination=stdout']
      : []),
    ...arquivos,
  ],
  { cwd: raizBackend, stdio: 'inherit' },
);
process.exit(execucao.status ?? 1);
