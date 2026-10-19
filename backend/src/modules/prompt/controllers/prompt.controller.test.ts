import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { PromptController } from './prompt.controller';

// SYSTEM.SPEC.md §12 (`prompt`): leitura, escrita e teste dos prompts são exclusivos de administrador.

test('verbos e caminhos das rotas dos prompts', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(PromptController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    [
      'GET /', 'GET :tipo/versoes', 'POST :tipo/rascunho', 'POST :tipo/testar',
      'POST :tipo/rascunho/ativar', 'POST :tipo/restaurar-padrao', 'DELETE :tipo/rascunho',
    ].sort(),
  );
});

test('toda rota é exclusiva de administrador e nenhuma é pública nem de gestor', () => {
  for (const rota of Object.values(rotasPorNome(PromptController))) {
    assert.equal(rota.administradorOnly, true, rota.nome);
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
  }
});

test('repassa tipo, DTO e usuário ativo à service certa (o teste de prompt vai à PromptTesteService)', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new PromptController(
    {
      listarTipos: registrar('listarTipos'), listarVersoes: registrar('listarVersoes'), salvarRascunho: registrar('salvarRascunho'),
      ativarRascunho: registrar('ativarRascunho'), restaurarPadrao: registrar('restaurarPadrao'), descartarRascunho: registrar('descartarRascunho'),
    } as never,
    { testar: registrar('testar') } as never,
  );
  const usuario = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
  const tipo = TipoPromptEnum.PAD;

  await controller.listarTipos(usuario);
  await controller.listarVersoes(tipo, { pagina: 2 }, usuario);
  await controller.salvarRascunho(tipo, { conteudo: 'a' } as never, usuario);
  await controller.testar(tipo, { conteudo: 'b' } as never, usuario);
  await controller.ativarRascunho(tipo, usuario);
  await controller.restaurarPadrao(tipo, usuario);
  await controller.descartarRascunho(tipo, usuario);

  assert.deepEqual(chamadas, [
    ['listarTipos', usuario], ['listarVersoes', tipo, { pagina: 2 }, usuario], ['salvarRascunho', tipo, { conteudo: 'a' }, usuario],
    ['testar', tipo, { conteudo: 'b' }, usuario], ['ativarRascunho', tipo, usuario], ['restaurarPadrao', tipo, usuario], ['descartarRascunho', tipo, usuario],
  ]);
});
