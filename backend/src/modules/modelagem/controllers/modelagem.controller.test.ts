import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ModelagemController } from './modelagem.controller';

// A tela Modelagem é de todos (desenvolvedor, gestor e administrador); só o gestor (e o administrador) mexe em grupos e posições.

const rotas = () => rotasPorNome(ModelagemController);

test('ver o diagrama é aberto a qualquer usuário autenticado', () => {
  assert.equal(rotas()['obterDiagrama'].gestorOnly, false);
});

test('criar, alterar e excluir grupo e alterar a tabela são @GestorOnly', () => {
  for (const nome of ['criarGrupo', 'alterarGrupo', 'excluirGrupo', 'alterarTabela']) assert.equal(rotas()[nome].gestorOnly, true, nome);
});

test('nenhuma rota é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  assert.deepEqual(
    Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['DELETE grupo/:id', 'GET /', 'POST grupo', 'PUT grupo/:id', 'PUT tabela/:nome'].sort(),
  );
});
