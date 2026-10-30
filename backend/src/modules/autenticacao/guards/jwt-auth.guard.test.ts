import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { Public } from '../decorators/public.decorator';

const SEGREDO = 'segredo-do-guard';

// Instanciar a strategy registra a estratégia 'jwt' no passport (como o módulo faz na subida da aplicação).
const USUARIOS = [
  { id: 1, login: 'x', tipo: TipoUsuarioEnum.GESTOR },
  { id: 5, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR },
  { id: 9, login: 'zed', tipo: TipoUsuarioEnum.ADMINISTRADOR },
].map((usuario) => ({ ...usuario, status: TipoUsuarioStatusEnum.ATIVO }));
const criarEstrategia = () =>
  new JwtStrategy({ obter: () => ({ jwt: { secreto: SEGREDO } }) } as never, { recuperar: async (dto: { id: number }) => USUARIOS.find((usuario) => usuario.id === dto.id) ?? null } as never);
criarEstrategia();

class ControllerDeTeste {
  @Public()
  aberta() { return 'ok'; }

  fechada() { return 'ok'; }
}

function contexto(metodo: 'aberta' | 'fechada', cabecalhos: Record<string, string> = {}) {
  const requisicao: Record<string, unknown> = { headers: cabecalhos };
  const resposta = {};
  const contextoDeExecucao = {
    getHandler: () => ControllerDeTeste.prototype[metodo],
    getClass: () => ControllerDeTeste,
    getType: () => 'http',
    getArgs: () => [requisicao, resposta],
    getArgByIndex: (indice: number) => [requisicao, resposta][indice],
    switchToHttp: () => ({ getRequest: () => requisicao, getResponse: () => resposta, getNext: () => undefined }),
  } as unknown as ExecutionContext;
  return { contextoDeExecucao, requisicao };
}

const guard = () => new JwtAuthGuard(new Reflector());
const jwt = new JwtService({ secret: SEGREDO });

test('rota @Public passa sem token', async () => {
  const { contextoDeExecucao } = contexto('aberta');
  assert.equal(await guard().canActivate(contextoDeExecucao), true);
});

test('rota fechada sem token é barrada com 401', async () => {
  const { contextoDeExecucao } = contexto('fechada');
  await assert.rejects(async () => guard().canActivate(contextoDeExecucao), UnauthorizedException);
});

test('rota fechada com token inválido ou de outro segredo é barrada com 401', async () => {
  const forjado = await new JwtService({ secret: 'outro-segredo' }).signAsync({ sub: 1, login: 'x', tipo: TipoUsuarioEnum.GESTOR });
  for (const token of ['lixo', forjado]) {
    const { contextoDeExecucao } = contexto('fechada', { authorization: `Bearer ${token}` });
    await assert.rejects(async () => guard().canActivate(contextoDeExecucao), UnauthorizedException, token);
  }
});

test('rota fechada com token expirado é barrada com 401', async () => {
  const expirado = await jwt.signAsync({ sub: 1, login: 'x', tipo: TipoUsuarioEnum.GESTOR }, { expiresIn: -10 });
  const { contextoDeExecucao } = contexto('fechada', { authorization: `Bearer ${expirado}` });
  await assert.rejects(async () => guard().canActivate(contextoDeExecucao), UnauthorizedException);
});

test('rota fechada com token válido passa e põe o payload em request.user', async () => {
  const token = await jwt.signAsync({ sub: 5, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR });
  const { contextoDeExecucao, requisicao } = contexto('fechada', { authorization: `Bearer ${token}` });
  assert.equal(await guard().canActivate(contextoDeExecucao), true);
  const usuario = requisicao['user'] as { sub: number; login: string; tipo: string };
  assert.deepEqual({ sub: usuario.sub, login: usuario.login, tipo: usuario.tipo }, { sub: 5, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR });
});

test('a strategy devolve o payload do token como o usuário da requisição', async () => {
  const payload = { sub: 9, login: 'zed', tipo: TipoUsuarioEnum.ADMINISTRADOR };
  assert.deepEqual(await criarEstrategia().validate(payload), payload);
});

test('rota fechada com token válido de usuário que foi desativado ou excluído é barrada com 401', async () => {
  const token = await jwt.signAsync({ sub: 404, login: 'fantasma', tipo: TipoUsuarioEnum.GESTOR });
  const { contextoDeExecucao } = contexto('fechada', { authorization: `Bearer ${token}` });
  await assert.rejects(async () => guard().canActivate(contextoDeExecucao), UnauthorizedException);
});
