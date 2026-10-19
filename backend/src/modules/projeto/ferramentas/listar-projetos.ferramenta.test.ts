import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { ProjetoService } from '../services/projeto.service';
import { LIMITE_PROJETOS_DA_FERRAMENTA, ListarProjetosFerramenta } from './listar-projetos.ferramenta';

const DESENVOLVEDOR = { sub: 3, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function projeto(id: number) {
  return { id, nome: `Projeto ${id}`, codigo: `P${id}`, cor: '#112233', status: TipoProjetoStatusEnum.ATIVO };
}

test('listar projetos chama a service com o usuário do token (as mesmas regras de acesso da tela) e pede todas as linhas', async () => {
  const chamadas: Array<{ filtros: unknown; usuario: unknown }> = [];
  const servico = { listar: async (filtros: unknown, usuario: unknown) => { chamadas.push({ filtros, usuario }); return { sucesso: true, dados: { itens: [projeto(1)] }, mensagem: '' }; } };
  const resultado = await new ListarProjetosFerramenta(servico as unknown as ProjetoService).executar({}, DESENVOLVEDOR);
  assert.deepEqual(chamadas, [{ filtros: { allRows: true }, usuario: DESENVOLVEDOR }]);
  assert.deepEqual(resultado.projetos, [{ id: 1, nome: 'Projeto 1', codigo: 'P1', status: TipoProjetoStatusEnum.ATIVO }]);
});

test('listar projetos devolve só id, nome, código e status (sem cor nem outros campos)', async () => {
  const servico = { listar: async () => ({ sucesso: true, dados: { itens: [projeto(1)] }, mensagem: '' }) };
  const resultado = await new ListarProjetosFerramenta(servico as unknown as ProjetoService).executar({}, DESENVOLVEDOR);
  assert.deepEqual(Object.keys(resultado.projetos[0]).sort(), ['codigo', 'id', 'nome', 'status']);
});

test('listar projetos limita a resposta e avisa que há mais', async () => {
  const itens = Array.from({ length: LIMITE_PROJETOS_DA_FERRAMENTA + 4 }, (_, indice) => projeto(indice + 1));
  const servico = { listar: async () => ({ sucesso: true, dados: { itens }, mensagem: '' }) };
  const resultado = await new ListarProjetosFerramenta(servico as unknown as ProjetoService).executar({}, DESENVOLVEDOR);
  assert.equal(resultado.projetos.length, LIMITE_PROJETOS_DA_FERRAMENTA);
  assert.equal(resultado.total, LIMITE_PROJETOS_DA_FERRAMENTA + 4);
  assert.equal(resultado.haMais, true);
});

test('sem projetos devolve lista vazia, total zero e sem "há mais"; a ferramenta é de leitura aberta', async () => {
  const servico = { listar: async () => ({ sucesso: true, dados: { itens: [] }, mensagem: '' }) };
  const ferramenta = new ListarProjetosFerramenta(servico as unknown as ProjetoService);
  assert.deepEqual(await ferramenta.executar({}, DESENVOLVEDOR), { projetos: [], total: 0, haMais: false });
  assert.equal(ferramenta.permissao, 'QUALQUER');
  assert.equal(ferramenta.tipo, 'LEITURA');
});
