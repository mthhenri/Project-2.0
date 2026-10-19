import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { TipoAtividadePrioridadeEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AtividadePrioridadeController } from './atividade-prioridade.controller';

// SYSTEM.SPEC.md §12: GET para qualquer autenticado (as telas precisam da cor e da ordem); PATCH só do administrador.

const rotas = () => rotasPorNome(AtividadePrioridadeController);

test('GET é aberto a qualquer autenticado; PATCH :codigo é só do administrador', () => {
  const { listar, alterarCor } = rotas();
  assert.deepEqual([`${listar.verbo} ${listar.caminho}`, listar.administradorOnly, listar.gestorOnly, listar.publica], ['GET /', false, false, false]);
  assert.deepEqual([`${alterarCor.verbo} ${alterarCor.caminho}`, alterarCor.administradorOnly, alterarCor.publica], ['PATCH :codigo', true, false]);
  assert.equal(Object.keys(rotas()).length, 2);
});

test('alterarCor repassa código, corpo e usuário do token à service', async () => {
  const chamadas: unknown[][] = [];
  const controller = new AtividadePrioridadeController({
    alterarCor: async (...argumentos: unknown[]) => { chamadas.push(argumentos); return null; },
  } as never);
  const usuario = { sub: 1 } as never;
  await controller.alterarCor(TipoAtividadePrioridadeEnum.ALTA, { cor: '#ff8800' }, usuario);
  assert.deepEqual(chamadas, [[TipoAtividadePrioridadeEnum.ALTA, { cor: '#ff8800' }, usuario]]);
});

test('o código da rota é validado contra o enum (código desconhecido não chega à service)', () => {
  const argumentos = Reflect.getMetadata(ROUTE_ARGS_METADATA, AtividadePrioridadeController, 'alterarCor') as Record<string, { data: string; pipes: unknown[] }>;
  const doCodigo = Object.values(argumentos).find((argumento) => argumento.data === 'codigo');
  assert.ok(doCodigo, 'parâmetro codigo declarado');
  assert.equal(doCodigo.pipes.length, 1, 'ParseEnumPipe aplicado');
});
