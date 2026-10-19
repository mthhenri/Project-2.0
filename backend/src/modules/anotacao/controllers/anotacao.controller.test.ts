import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAnotacaoEnum, TipoUsuarioEnum } from '@project20/shared';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AnotacaoController } from './anotacao.controller';

// SYSTEM.SPEC.md §12 (anotacao): a regra de acesso (dono, gestor, administrador) mora na service; o controller só
// expõe as rotas, valida os parâmetros e junta usuário e tipo da URL ao corpo.

const rotas = () => rotasPorNome(AnotacaoController);

test('verbos e caminhos de todas as rotas do pad', () => {
  assert.deepEqual(
    Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['GET /', 'PATCH :usuarioId/:tipo/trecho', 'POST :usuarioId/:tipo/anexo', 'POST :usuarioId/feito', 'POST :usuarioId/mover', 'PUT :usuarioId/:tipo'].sort(),
  );
});

test('nenhuma rota é pública nem exclusiva de gestor: o dono usa o próprio pad e a service decide o resto', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.gestorOnly, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

const USUARIO_ATIVO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('o controller junta usuarioId e tipo da URL ao corpo e repassa o usuário ativo', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new AnotacaoController({
    listar: registrar('listar'), alterar: registrar('alterar'), trocarTrecho: registrar('trocarTrecho'),
    anexarTexto: registrar('anexarTexto'), anexarFeito: registrar('anexarFeito'), moverTrecho: registrar('moverTrecho'),
  } as never);
  const data = new Date('2026-01-15T12:00:00Z');

  await controller.listar({ usuarioId: 7 }, USUARIO_ATIVO);
  await controller.alterar(7, TipoAnotacaoEnum.PESSOAL, { texto: 'a', updatedDateLido: data }, USUARIO_ATIVO);
  await controller.trocarTrecho(7, TipoAnotacaoEnum.LEMBRETE, { trechoAntigo: 'a', trechoNovo: 'b' }, USUARIO_ATIVO);
  await controller.anexarTexto(7, TipoAnotacaoEnum.PENDENCIA, { texto: 'c' }, USUARIO_ATIVO);
  await controller.anexarFeito(7, { texto: 'd' }, USUARIO_ATIVO);
  await controller.moverTrecho(7, { tipoOrigem: TipoAnotacaoEnum.FEITO, tipoDestino: TipoAnotacaoEnum.PESSOAL, trecho: 'e', updatedDateOrigemLido: data, updatedDateDestinoLido: data }, USUARIO_ATIVO);

  assert.deepEqual(chamadas, [
    ['listar', { usuarioId: 7 }, USUARIO_ATIVO],
    ['alterar', { texto: 'a', updatedDateLido: data, usuarioId: 7, tipo: 'PESSOAL' }, USUARIO_ATIVO],
    ['trocarTrecho', { trechoAntigo: 'a', trechoNovo: 'b', usuarioId: 7, tipo: 'LEMBRETE' }, USUARIO_ATIVO],
    ['anexarTexto', { texto: 'c', usuarioId: 7, tipo: 'PENDENCIA' }, USUARIO_ATIVO],
    ['anexarFeito', { texto: 'd', usuarioId: 7 }, USUARIO_ATIVO],
    ['moverTrecho', { tipoOrigem: 'FEITO', tipoDestino: 'PESSOAL', trecho: 'e', updatedDateOrigemLido: data, updatedDateDestinoLido: data, usuarioId: 7 }, USUARIO_ATIVO],
  ]);
});
