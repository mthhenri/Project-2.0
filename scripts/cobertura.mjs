// Mede a cobertura de testes de cada workspace e junta o resumo em `.artifacts/cobertura/resumo.txt`
// (pasta ignorada pelo Git). Só mede — não há gate de porcentagem (task 172).
// Uso: npm run test:cobertura
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, '.artifacts/cobertura');
mkdirSync(destino, { recursive: true });

const workspaces = ['shared', 'backend', 'frontend', 'desktop'];
const linhasDoResumo = [];
let falhou = false;

for (const workspace of workspaces) {
  console.log(`\n=== cobertura: ${workspace} ===`);
  const execucao = spawnSync('npm', ['run', 'test:cobertura', `--workspace=${workspace}`], {
    cwd: raiz,
    encoding: 'utf8',
    shell: true,
  });
  const saida = `${execucao.stdout ?? ''}${execucao.stderr ?? ''}`;
  writeFileSync(resolve(destino, `${workspace}.txt`), saida);
  if (execucao.status !== 0) {
    falhou = true;
    console.error(saida);
    linhasDoResumo.push(`${workspace}: FALHOU (veja ${workspace}.txt)`);
    continue;
  }
  const resumo = extrairResumo(workspace, saida);
  linhasDoResumo.push(`${workspace}: ${resumo}`);
  console.log(resumo);
}

writeFileSync(resolve(destino, 'resumo.txt'), `${linhasDoResumo.join('\n')}\n`);
console.log(`\nResumo gravado em ${resolve(destino, 'resumo.txt')}`);
process.exit(falhou ? 1 : 0);

/** Frontend (Vitest) imprime "Statements : x%"; os demais (Node) imprimem a linha "all files | linhas | ramos | funções". */
function extrairResumo(workspace, saida) {
  if (workspace === 'frontend') {
    const campo = (nome) => saida.match(new RegExp(`${nome}\\s*:\\s*([\\d.]+)%`))?.[1] ?? '?';
    return `statements ${campo('Statements')}% · branches ${campo('Branches')}% · functions ${campo('Functions')}% · lines ${campo('Lines')}%`;
  }
  const linha = saida.split('\n').find((texto) => /all files\s*\|/i.test(texto));
  if (!linha) return 'resumo não encontrado (veja o .txt)';
  const [, linhas, ramos, funcoes] = linha.split('|').map((parte) => parte.trim());
  return `lines ${linhas}% · branches ${ramos}% · functions ${funcoes}%`;
}
