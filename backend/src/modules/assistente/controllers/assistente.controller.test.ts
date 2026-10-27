import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AssistenteController } from './assistente.controller';

// SYSTEM.SPEC.md §12 (`assistente`): uma rota, para qualquer usuário autenticado (nem gestor nem administrador).

test('duas rotas, POST auxiliar-descricao e POST alterar-trecho, abertas a qualquer usuário autenticado', () => {
  const rotas = Object.values(rotasPorNome(AssistenteController));
  assert.deepEqual(rotas.map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), ['POST alterar-trecho', 'POST auxiliar-descricao']);
  for (const rota of rotas) {
    assert.equal(rota.publica, false);
    assert.equal(rota.gestorOnly, false);
    assert.equal(rota.administradorOnly, false);
  }
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

test('alterar-trecho repassa o DTO e o usuário ativo à service', async () => {
  const recebidos: unknown[][] = [];
  const controller = new AssistenteController({ alterarTrecho: async (...argumentos: unknown[]) => { recebidos.push(argumentos); return null; } } as never);
  const dto = { demandaId: 1, aba: 'DOCUMENTACAO', bloco: 'a', selecao: 'a', pedido: 'b' } as never;
  const usuario = { sub: 1, login: 'g', tipo: 'GESTOR' } as never;
  await controller.alterarTrecho(dto, usuario);
  assert.deepEqual(recebidos, [[dto, usuario]]);
});
