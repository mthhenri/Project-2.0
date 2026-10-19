import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { DesktopService } from './desktop.service';

const servicoCom = (pastaExecutaveis: string | undefined) =>
  new DesktopService({ obter: () => ({ desktop: { pastaExecutaveis } }) } as never);

function comPasta(arquivos: Record<string, string>, executar: (pasta: string) => Promise<void>) {
  const pasta = mkdtempSync(join(tmpdir(), 'desktop-service-'));
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(pasta, nome), conteudo);
  return executar(pasta).finally(() => rmSync(pasta, { recursive: true, force: true }));
}

test('com executáveis na pasta, devolve a maior versão com nome e tamanho', () =>
  comPasta({ 'Project-Desktop-1.9.0.exe': 'a', 'Project-Desktop-1.10.0.exe': '12345', 'leia-me.txt': 'x' }, async (pasta) => {
    const { dados } = await servicoCom(pasta).recuperarVersao();
    assert.deepEqual(dados, { disponivel: true, versao: '1.10.0', nomeArquivo: 'Project-Desktop-1.10.0.exe', tamanhoBytes: 5 });
  }));

test('sem pasta configurada, com pasta inexistente ou sem executável: não há download e a versão vem indisponível', async () => {
  const indisponivel = { disponivel: false, versao: null, nomeArquivo: null, tamanhoBytes: null };
  assert.deepEqual((await servicoCom(undefined).recuperarVersao()).dados, indisponivel);
  assert.deepEqual((await servicoCom(join(tmpdir(), 'pasta-que-nao-existe-198')).recuperarVersao()).dados, indisponivel);
  await comPasta({ 'leia-me.txt': 'x' }, async (pasta) => {
    assert.deepEqual((await servicoCom(pasta).recuperarVersao()).dados, indisponivel);
    await assert.rejects(servicoCom(pasta).prepararDownload(), ResourceNotFoundException);
  });
  await assert.rejects(servicoCom(undefined).prepararDownload(), ResourceNotFoundException);
});

test('prepararDownload devolve o caminho dentro da pasta configurada (o nome vem da lista, nunca do cliente)', () =>
  comPasta({ 'Project-Desktop-1.2.0.exe': 'abc' }, async (pasta) => {
    const executavel = await servicoCom(pasta).prepararDownload();
    assert.equal(executavel.caminho, join(pasta, 'Project-Desktop-1.2.0.exe'));
    assert.equal(executavel.nomeArquivo, 'Project-Desktop-1.2.0.exe');
    assert.equal(executavel.tamanhoBytes, 3);
  }));

test('uma pasta com o nome de executável não vale (só arquivo)', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'desktop-service-'));
  try {
    mkdirSync(join(pasta, 'Project-Desktop-9.9.9.exe'));
    assert.equal((await servicoCom(pasta).recuperarVersao()).dados?.disponivel, false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
