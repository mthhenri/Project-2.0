import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { obterConexaoBancoTeste, obterNomeBancoTeste, testarComBanco } from './banco-teste';
import { criarRepositorio } from './criar-repositorio';
import { criarTag, criarDesenvolvedor, criarGestor, criarAdministrador } from './fabricas';
import { UsuarioRepository } from '../modules/usuario/repositories/usuario.repository';

describe('infraestrutura de teste de integração', () => {
  testarComBanco('usa o banco de teste, nunca o de desenvolvimento', async (conexao) => {
    const nome = obterNomeBancoTeste();
    assert.ok(nome.endsWith('_teste') || nome === process.env.DB_NOME_TESTE);
    assert.notEqual(nome, process.env.DB_NOME);
    const { rows } = await conexao.raw('SELECT current_database() AS nome');
    assert.equal(rows[0].nome, nome);
    assert.ok(obterConexaoBancoTeste());
  });

  testarComBanco('isolamento (1/2): grava dentro do teste', async (conexao) => {
    await criarTag(conexao, { nome: 'Tag do isolamento' });
    const { rows } = await conexao.raw(`SELECT count(*)::int AS total FROM tag WHERE tag.nome = 'Tag do isolamento'`);
    assert.equal(rows[0].total, 1);
  });

  testarComBanco('isolamento (2/2): o que o teste anterior gravou não existe mais', async (conexao) => {
    const { rows } = await conexao.raw(`SELECT count(*)::int AS total FROM tag WHERE tag.nome = 'Tag do isolamento'`);
    assert.equal(rows[0].total, 0);
  });

  testarComBanco('repository com transação própria (usuario.inserir) funciona dentro do isolamento', async (conexao) => {
    const repositorio = criarRepositorio(UsuarioRepository, conexao);
    const criado = await repositorio.inserir({
      login: 'usuario.transacao.interna', senhaEncriptada: 'hash', nomeCompleto: 'Teste Transação',
      cargoTitulo: 'Cargo', tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8,
    });
    const { rows } = await conexao.raw(
      'SELECT count(*)::int AS total FROM anotacao WHERE anotacao.usuario_id = :usuarioId', { usuarioId: criado.id });
    assert.ok(rows[0].total > 0, 'as seções do pad nascem na mesma transação do usuário');
  });

  testarComBanco('fábricas de usuário respeitam o tipo pedido', async (conexao) => {
    const tipos = [await criarDesenvolvedor(conexao), await criarGestor(conexao), await criarAdministrador(conexao)]
      .map((usuario) => usuario.tipo);
    assert.deepEqual(tipos, [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]);
  });
});
