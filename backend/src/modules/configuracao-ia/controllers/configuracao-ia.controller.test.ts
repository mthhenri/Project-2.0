import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ConfiguracaoIaController } from './configuracao-ia.controller';

// SYSTEM.SPEC.md §12 (`configuracao-ia`): leitura e escrita exclusivas de administrador.

test('verbos e caminhos das rotas da configuração', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(ConfiguracaoIaController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET /', 'GET versoes', 'POST /'].sort(),
  );
});

test('toda rota é exclusiva de administrador e nenhuma é pública nem de gestor', () => {
  for (const rota of Object.values(rotasPorNome(ConfiguracaoIaController))) {
    assert.equal(rota.administradorOnly, true, rota.nome);
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
  }
});

test('repassa o DTO e o usuário ativo à service', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new ConfiguracaoIaController({ recuperarAtiva: registrar('recuperarAtiva'), listar: registrar('listar'), criar: registrar('criar') } as never);
  const usuario = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;

  await controller.recuperarAtiva(usuario);
  await controller.listar({ pagina: 2 }, usuario);
  await controller.criar({ modeloPadrao: 'x' } as never, usuario);

  assert.deepEqual(chamadas, [['recuperarAtiva', usuario], ['listar', { pagina: 2 }, usuario], ['criar', { modeloPadrao: 'x' }, usuario]]);
});
