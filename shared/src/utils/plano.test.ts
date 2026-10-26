import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlanoAbaEnum } from '../enums/plano-aba.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { podeAcessarPlano, podeArquivarOuExcluirPlano, podeVerAbaDoPlano, textoInicialDaAba } from './plano';

const base = { usuarioId: 2, criadorId: 1, projetoId: 10, isSolo: false, temAcessoAoProjeto: false };

test('a aba do cliente é só do gestor e do administrador; as outras são de todos', () => {
  for (const aba of [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO]) {
    for (const tipo of Object.values(TipoUsuarioEnum)) assert.equal(podeVerAbaDoPlano(aba, tipo), true);
  }
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.DESENVOLVEDOR), false);
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.GESTOR), true);
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.ADMINISTRADOR), true);
});

test('plano de projeto: gestor e administrador por tipo, desenvolvedor só com acesso ao projeto', () => {
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.GESTOR }), true);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), true);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR }), false);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR, temAcessoAoProjeto: true }), true);
});

test('plano solo: só o criador, mesmo para gestor e administrador', () => {
  const solo = { ...base, isSolo: true, temAcessoAoProjeto: true };
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.GESTOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR, usuarioId: 1 }), true);
});

test('plano amplo (sem projeto): só o criador', () => {
  const amplo = { ...base, projetoId: null };
  assert.equal(podeAcessarPlano({ ...amplo, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), false);
  assert.equal(podeAcessarPlano({ ...amplo, tipoUsuario: TipoUsuarioEnum.GESTOR, usuarioId: 1 }), true);
});

test('arquivar e excluir: criador, gestor e administrador', () => {
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.DESENVOLVEDOR, 1, 1), true);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.DESENVOLVEDOR, 2, 1), false);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.GESTOR, 2, 1), true);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.ADMINISTRADOR, 2, 1), true);
});

test('ponto de partida: só aba vazia recebe o texto da demanda', () => {
  assert.equal(textoInicialDaAba(null, 'da demanda'), 'da demanda');
  assert.equal(textoInicialDaAba('  \n', 'da demanda'), 'da demanda');
  assert.equal(textoInicialDaAba('já escrito', 'da demanda'), null);
  assert.equal(textoInicialDaAba(null, null), null);
  assert.equal(textoInicialDaAba('', '   '), null);
});
