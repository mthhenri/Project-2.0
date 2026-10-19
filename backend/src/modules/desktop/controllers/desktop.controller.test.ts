import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { DesktopController } from './desktop.controller';

test('duas rotas de leitura, abertas a qualquer usuário autenticado (nem públicas, nem de gestor)', () => {
  const rotas = Object.values(rotasPorNome(DesktopController));
  assert.deepEqual(rotas.map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), ['GET download', 'GET versao']);
  for (const rota of rotas) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
  }
});

test('baixar entrega o arquivo como anexo, com o nome e o tamanho do executável', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'desktop-controller-'));
  try {
    const caminho = join(pasta, 'Project-Desktop-1.2.0.exe');
    writeFileSync(caminho, 'conteudo');
    const cabecalhos: Record<string, string> = {};
    const resposta = { setHeader: (nome: string, valor: string) => { cabecalhos[nome] = valor; } };
    const controller = new DesktopController({ prepararDownload: async () => ({ caminho, nomeArquivo: 'Project-Desktop-1.2.0.exe', tamanhoBytes: 8 }) } as never);
    const arquivo = await controller.baixar(resposta as never);
    assert.ok(arquivo);
    assert.equal(cabecalhos['Content-Disposition'], 'attachment; filename="Project-Desktop-1.2.0.exe"');
    assert.equal(cabecalhos['Content-Length'], '8');
    const fluxo = arquivo.getStream();
    const fechado = new Promise((resolver) => fluxo.once('close', resolver));
    fluxo.destroy();
    await fechado;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
