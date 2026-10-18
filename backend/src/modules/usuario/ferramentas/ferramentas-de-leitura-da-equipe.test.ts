import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum, UsuarioListarDto } from '@project20/shared';
import { TagService } from '../../tag/services/tag.service';
import { ListarTagsFerramenta, LIMITE_TAGS_DA_FERRAMENTA } from '../../tag/ferramentas/listar-tags.ferramenta';
import { UsuarioService } from '../services/usuario.service';
import { LIMITE_USUARIOS_DA_FERRAMENTA, ListarUsuariosFerramenta } from './listar-usuarios.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function usuario(id: number) {
  return {
    id, login: `user.${id}`, nomeCompleto: `Pessoa ${id}`, cargoTitulo: 'Desenvolvedor', tipo: TipoUsuarioEnum.DESENVOLVEDOR,
    status: TipoUsuarioStatusEnum.ATIVO, temAnotacoes: true, senhaEncriptada: 'nao-pode-vazar', horasDiariasNecessarias: 8,
  };
}

test('listar usuários pede só os ativos, repassa os filtros e não devolve dado além de nome, login, cargo e tipo', async () => {
  const filtros: UsuarioListarDto[] = [];
  const servico = { listar: async (dto: UsuarioListarDto) => { filtros.push(dto); return { sucesso: true, dados: { itens: [usuario(2)] }, mensagem: '' }; } };
  const ferramenta = new ListarUsuariosFerramenta(servico as unknown as UsuarioService);
  const resultado = await ferramenta.executar({ tipo: TipoUsuarioEnum.DESENVOLVEDOR, busca: 'pes' }, GESTOR);
  assert.deepEqual(filtros[0], { tipo: TipoUsuarioEnum.DESENVOLVEDOR, busca: 'pes', status: TipoUsuarioStatusEnum.ATIVO, allRows: true });
  assert.deepEqual(resultado.usuarios, [{ id: 2, nome: 'Pessoa 2', login: 'user.2', cargo: 'Desenvolvedor', tipo: 'DESENVOLVEDOR' }]);
  assert.equal(JSON.stringify(resultado).includes('nao-pode-vazar'), false);
  assert.equal(ferramenta.permissao, 'GESTOR');
});

test('listar usuários limita a resposta e avisa que há mais', async () => {
  const itens = Array.from({ length: LIMITE_USUARIOS_DA_FERRAMENTA + 3 }, (_, indice) => usuario(indice + 1));
  const servico = { listar: async () => ({ sucesso: true, dados: { itens }, mensagem: '' }) };
  const resultado = await new ListarUsuariosFerramenta(servico as unknown as UsuarioService).executar({}, GESTOR);
  assert.equal(resultado.usuarios.length, LIMITE_USUARIOS_DA_FERRAMENTA);
  assert.equal(resultado.total, LIMITE_USUARIOS_DA_FERRAMENTA + 3);
  assert.equal(resultado.haMais, true);
});

test('listar tags devolve id, nome e cor, limita e é de leitura aberta', async () => {
  const tags = Array.from({ length: LIMITE_TAGS_DA_FERRAMENTA + 2 }, (_, indice) => ({ id: indice + 1, nome: `Tag ${indice + 1}`, cor: '#112233' }));
  const servico = { listar: async () => ({ sucesso: true, dados: tags, mensagem: '' }) };
  const ferramenta = new ListarTagsFerramenta(servico as unknown as TagService);
  const resultado = await ferramenta.executar({}, GESTOR);
  assert.equal(resultado.tags.length, LIMITE_TAGS_DA_FERRAMENTA);
  assert.deepEqual(resultado.tags[0], { id: 1, nome: 'Tag 1', cor: '#112233' });
  assert.equal(resultado.haMais, true);
  assert.equal(ferramenta.permissao, 'QUALQUER');
  assert.equal(ferramenta.tipo, 'LEITURA');
});
