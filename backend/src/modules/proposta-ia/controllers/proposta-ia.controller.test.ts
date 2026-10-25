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
    ['GET :id', 'POST :id/ajustar', 'POST :id/confirmar', 'POST :id/desfazer', 'POST :id/recusar', 'POST grupo/confirmar', 'POST grupo/desfazer', 'POST grupo/recusar'].sort(),
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
    confirmarGrupo: registrar('confirmarGrupo'), recusarGrupo: registrar('recusarGrupo'), desfazerGrupo: registrar('desfazerGrupo'),
  } as never);
  const usuario = { sub: 4, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

  await controller.recuperarPorId(8, usuario);
  await controller.confirmar(8, usuario);
  await controller.ajustar(8, { dados: { a: 1 } }, usuario);
  await controller.recusar(8, usuario);
  await controller.desfazer(8, usuario);
  await controller.confirmarGrupo({ propostaIds: [1, 2] }, usuario);
  await controller.recusarGrupo({ propostaIds: [3] }, usuario);
  await controller.desfazerGrupo({ propostaIds: [4, 5] }, usuario);

  assert.deepEqual(chamadas, [
    ['recuperarPorId', 8, usuario], ['confirmar', 8, usuario], ['ajustar', 8, { dados: { a: 1 } }, usuario], ['recusar', 8, usuario], ['desfazer', 8, usuario],
    ['confirmarGrupo', { propostaIds: [1, 2] }, usuario], ['recusarGrupo', { propostaIds: [3] }, usuario], ['desfazerGrupo', { propostaIds: [4, 5] }, usuario],
  ]);
});

test('as rotas do grupo vêm antes das de :id, senão "grupo" seria lido como o id', () => {
  const caminhos = Object.values(rotasPorNome(PropostaIaController)).map((rota) => rota.caminho);
  const primeiraComId = caminhos.findIndex((caminho) => caminho.startsWith(':id'));
  const ultimaDoGrupo = caminhos.map((caminho) => caminho.startsWith('grupo/')).lastIndexOf(true);
  assert.ok(ultimaDoGrupo >= 0 && ultimaDoGrupo < primeiraComId, caminhos.join(' | '));
});
