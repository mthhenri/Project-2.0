// Garante o Postgres de pé antes do `npm run dev`: se o Docker Desktop estiver
// fechado, inicia o daemon e espera; depois sobe o compose e aguarda o healthcheck.
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as esperar } from 'node:timers/promises';

const executar = promisify(execFile);

const TIMEOUT_DAEMON_MS = 120_000;
const INTERVALO_TENTATIVA_MS = 2_000;

async function daemonRespondendo() {
  try {
    await executar('docker', ['info']);
    return true;
  } catch {
    return false;
  }
}

async function aguardarDaemon() {
  const limite = Date.now() + TIMEOUT_DAEMON_MS;
  while (Date.now() < limite) {
    if (await daemonRespondendo()) return true;
    await esperar(INTERVALO_TENTATIVA_MS);
  }
  return false;
}

if (!(await daemonRespondendo())) {
  console.log('[db] Docker não está respondendo — iniciando o Docker Desktop...');
  try {
    execFileSync('docker', ['desktop', 'start'], { stdio: 'inherit' });
  } catch {
    console.error('[db] Falha ao iniciar o Docker Desktop. Abra-o manualmente e rode de novo.');
    process.exit(1);
  }

  if (!(await aguardarDaemon())) {
    console.error(`[db] Docker Desktop não ficou pronto em ${TIMEOUT_DAEMON_MS / 1000}s.`);
    process.exit(1);
  }
  console.log('[db] Docker pronto.');
}

execFileSync('docker', ['compose', 'up', '-d', '--wait'], { stdio: 'inherit' });
