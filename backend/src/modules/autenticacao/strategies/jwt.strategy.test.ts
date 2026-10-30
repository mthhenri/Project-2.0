import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { JwtStrategy } from './jwt.strategy';

const PAYLOAD = { sub: 7, login: 'maria', tipo: TipoUsuarioEnum.GESTOR };
const ATIVO = { id: 7, login: 'maria', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO };

function criarEstrategia(usuario: Record<string, unknown> | null) {
  const consultas: Array<{ id?: number }> = [];
  const repositorio = { recuperar: async (dto: { id?: number }) => { consultas.push(dto); return usuario; } };
  const estrategia = new JwtStrategy({ obter: () => ({ jwt: { secreto: 'segredo-da-estrategia' } }) } as never, repositorio as never);
  return { estrategia, consultas };
}

test('usuário ativo passa e a consulta é feita pelo id do token', async () => {
  const { estrategia, consultas } = criarEstrategia(ATIVO);
  assert.deepEqual(await estrategia.validate(PAYLOAD), PAYLOAD);
  assert.deepEqual(consultas, [{ id: 7 }]);
});

test('usuário inativo é barrado com 401 mesmo com token ainda válido', async () => {
  const { estrategia } = criarEstrategia({ ...ATIVO, status: TipoUsuarioStatusEnum.INATIVO });
  await assert.rejects(() => estrategia.validate(PAYLOAD), UnauthorizedException);
});

test('usuário excluído (o repository não o devolve) é barrado com 401', async () => {
  const { estrategia } = criarEstrategia(null);
  await assert.rejects(() => estrategia.validate(PAYLOAD), UnauthorizedException);
});

test('token sem id de usuário válido é barrado com 401 sem consultar o repository', async () => {
  const { estrategia, consultas } = criarEstrategia(ATIVO);
  for (const sub of [undefined, null, 'abc', 1.5, NaN]) {
    await assert.rejects(() => estrategia.validate({ ...PAYLOAD, sub } as never), UnauthorizedException, String(sub));
  }
  assert.deepEqual(consultas, []);
});

test('o tipo e o login valem os de agora, não os gravados no token', async () => {
  const { estrategia } = criarEstrategia({ ...ATIVO, login: 'maria.silva', tipo: TipoUsuarioEnum.DESENVOLVEDOR });
  assert.deepEqual(await estrategia.validate({ ...PAYLOAD, tipo: TipoUsuarioEnum.ADMINISTRADOR }), { sub: 7, login: 'maria.silva', tipo: TipoUsuarioEnum.DESENVOLVEDOR });
});
