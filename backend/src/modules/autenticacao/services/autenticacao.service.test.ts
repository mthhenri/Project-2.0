import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AutenticacaoService } from './autenticacao.service';

const SEGREDO = 'segredo-de-teste';

async function criarServico(usuarios: Array<Record<string, unknown>>) {
  const todos: Array<Record<string, unknown>> = usuarios;
  const hash = await bcrypt.hash('SenhaCerta#1', 4);
  const repositorio = {
    // O repository real já filtra excluídos (`is_deleted = false`): o dublê só devolve o que ele devolveria.
    recuperar: async (dto: { login?: string }) =>
      todos.map((usuario): Record<string, unknown> => ({ senhaEncriptada: hash, ...usuario })).find((usuario) => usuario.login === dto.login) ?? null,
  };
  const jwt = new JwtService({ secret: SEGREDO, signOptions: { expiresIn: '8h' } });
  return { servico: new AutenticacaoService(repositorio as never, jwt), jwt };
}

const ATIVO = { id: 7, login: 'maria', nomeCompleto: 'Maria', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO };

test('credencial válida gera token com o JwtPayload esperado (sub, login, tipo) e devolve o usuário sem dado sensível', async () => {
  const { servico, jwt } = await criarServico([ATIVO]);
  const resposta = await servico.login({ login: 'maria', senha: 'SenhaCerta#1' });

  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.tipo, 'Bearer');
  assert.deepEqual(resposta.dados?.usuario, { id: 7, login: 'maria', nomeCompleto: 'Maria', tipo: TipoUsuarioEnum.GESTOR });

  const payload = await jwt.verifyAsync(resposta.dados!.accessToken);
  assert.equal(payload.sub, 7);
  assert.equal(payload.login, 'maria');
  assert.equal(payload.tipo, TipoUsuarioEnum.GESTOR);
  assert.ok(payload.exp > payload.iat, 'o token expira');
  assert.equal(JSON.stringify(resposta).includes('senha'), false);
});

test('o token de administrador carrega o tipo ADMINISTRADOR', async () => {
  const { servico, jwt } = await criarServico([{ ...ATIVO, tipo: TipoUsuarioEnum.ADMINISTRADOR }]);
  const resposta = await servico.login({ login: 'maria', senha: 'SenhaCerta#1' });
  assert.equal((await jwt.verifyAsync(resposta.dados!.accessToken)).tipo, TipoUsuarioEnum.ADMINISTRADOR);
});

test('senha errada e login inexistente dão a MESMA mensagem de erro', async () => {
  const { servico } = await criarServico([ATIVO]);
  const senhaErrada = await servico.login({ login: 'maria', senha: 'errada' }).catch((erro) => erro);
  const loginInexistente = await servico.login({ login: 'fantasma', senha: 'SenhaCerta#1' }).catch((erro) => erro);

  assert.ok(senhaErrada instanceof BusinessException);
  assert.ok(loginInexistente instanceof BusinessException);
  assert.deepEqual(senhaErrada.getResponse(), loginInexistente.getResponse());
  assert.equal((senhaErrada.getResponse() as { mensagem: string }).mensagem, 'Usuário ou senha incorretos. Confira e tente de novo.');
});

test('usuário inativo não entra, mesmo com a senha certa', async () => {
  const { servico } = await criarServico([{ ...ATIVO, status: TipoUsuarioStatusEnum.INATIVO }]);
  await assert.rejects(() => servico.login({ login: 'maria', senha: 'SenhaCerta#1' }), (erro: BusinessException) => {
    assert.equal((erro.getResponse() as { mensagem: string }).mensagem, 'Usuário inativo');
    return true;
  });
});

test('usuário excluído não entra: o repository não o devolve e o login cai na mensagem de credencial incorreta', async () => {
  const { servico } = await criarServico([]);
  await assert.rejects(() => servico.login({ login: 'maria', senha: 'SenhaCerta#1' }), (erro: BusinessException) => {
    assert.equal((erro.getResponse() as { mensagem: string }).mensagem, 'Usuário ou senha incorretos. Confira e tente de novo.');
    return true;
  });
});

test('validarCredenciais devolve null para senha errada e o usuário para senha certa', async () => {
  const { servico } = await criarServico([ATIVO]);
  assert.equal(await servico.validarCredenciais('maria', 'errada'), null);
  assert.equal((await servico.validarCredenciais('maria', 'SenhaCerta#1'))?.id, 7);
});
