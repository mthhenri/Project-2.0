import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AssistenteController } from './assistente.controller';

// SYSTEM.SPEC.md §12 (`assistente`): uma rota, para qualquer usuário autenticado (nem gestor nem administrador).

test('uma só rota, POST auxiliar-descricao, aberta a qualquer usuário autenticado', () => {
  const rotas = Object.values(rotasPorNome(AssistenteController));
  assert.deepEqual(rotas.map((rota) => `${rota.verbo} ${rota.caminho}`), ['POST auxiliar-descricao']);
  assert.equal(rotas[0].publica, false);
  assert.equal(rotas[0].gestorOnly, false);
  assert.equal(rotas[0].administradorOnly, false);
});

test('o controller exige login (JwtAuthGuard)', () => {
  assert.ok((Reflect.getMetadata(GUARDS_METADATA, AssistenteController) as unknown[]).includes(JwtAuthGuard));
});

test('repassa o DTO à service', async () => {
  const recebidos: unknown[] = [];
  const controller = new AssistenteController({ auxiliarDescricao: async (dto: unknown) => { recebidos.push(dto); return null; } } as never);
  const dto = { textoOriginal: 'a', tipoEntidade: 'execucao', contextoEntidade: 'b' } as const;
  await controller.auxiliarDescricao(dto);
  assert.deepEqual(recebidos, [dto]);
});
