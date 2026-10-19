import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { PropostaIaController } from './proposta-ia.controller';

// SYSTEM.SPEC.md §12 (`proposta-ia`): qualquer usuário autenticado resolve as PRÓPRIAS propostas (a service confere o dono,
// inclusive para gestor e administrador); criar não tem rota — só a ferramenta cria.

test('só rotas de leitura e resolução; nenhuma cria proposta', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(PropostaIaController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET :id', 'POST :id/ajustar', 'POST :id/confirmar', 'POST :id/desfazer', 'POST :id/recusar'].sort(),
  );
});

test('nenhuma rota é pública, de gestor ou de administrador: o acesso é do dono, conferido na service', () => {
  for (const rota of Object.values(rotasPorNome(PropostaIaController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('repassa o id, o DTO e o usuário ativo (o dono é decidido pelo token, nunca pelo corpo)', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new PropostaIaController({
    recuperarPorId: registrar('recuperarPorId'), confirmar: registrar('confirmar'), ajustar: registrar('ajustar'),
    recusar: registrar('recusar'), desfazer: registrar('desfazer'),
  } as never);
  const usuario = { sub: 4, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

  await controller.recuperarPorId(8, usuario);
  await controller.confirmar(8, usuario);
  await controller.ajustar(8, { dados: { a: 1 } }, usuario);
  await controller.recusar(8, usuario);
  await controller.desfazer(8, usuario);

  assert.deepEqual(chamadas, [
    ['recuperarPorId', 8, usuario], ['confirmar', 8, usuario], ['ajustar', 8, { dados: { a: 1 } }, usuario], ['recusar', 8, usuario], ['desfazer', 8, usuario],
  ]);
});
