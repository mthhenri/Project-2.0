import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TagService } from './tag.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): TagService {
  const servico = Object.create(TagService.prototype) as Record<string, unknown>;
  servico.tagRepositorio = repositorio;
  return servico as unknown as TagService;
}

test('restaurar: tag inexistente entre as excluídas lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluida: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando já existe tag ativa com o mesmo nome e não chama a restauração', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
    validarNome: async () => true,
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});

test('restaurar: sem conflito reativa a tag e devolve o registro', async () => {
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
    validarNome: async () => false,
    restaurar: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
  });
  const resposta = await servico.restaurar({ id: 1 });
  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.id, 1);
});

// §14 "Criar e atribuir tag": só o gestor cria. A permissão vive no controller (@GestorOnly); a service não recebe
// usuário. Aqui ficam a unicidade do nome, o repasse dos campos e o que não pode ser gravado quando a regra recusa.
// A unicidade é do nome exato entre as ativas (o documento não fala de caixa nem de acento; a tela confere sem
// caixa/acento antes de enviar, o servidor compara literalmente).

function criarServicoComRegistro(sobrescritas: Record<string, unknown> = {}) {
  const gravacoes: string[] = [];
  const repositorio = {
    validarNome: async () => false,
    recuperar: async () => ({ id: 1, nome: 'Backend', cor: '#112233', createdDate: new Date() }),
    inserir: async (dados: { nome: string; cor: string }) => { gravacoes.push('inserir'); return { id: 5, ...dados, createdDate: new Date() }; },
    alterar: async (dados: { id: number; nome?: string; cor?: string }) => { gravacoes.push('alterar'); return { ...dados, createdDate: new Date() }; },
    excluir: async () => { gravacoes.push('excluir'); },
    ...sobrescritas,
  };
  return { servico: criarServico(repositorio), gravacoes };
}

test('criar: grava só nome e cor e devolve a tag criada', async () => {
  let recebido: unknown;
  const { servico } = criarServicoComRegistro({
    inserir: async (dados: unknown) => { recebido = dados; return { id: 5, nome: 'Infra', cor: '#abcdef', createdDate: new Date() }; },
  });
  const resposta = await servico.criar({ nome: 'Infra', cor: '#abcdef' });
  assert.deepEqual(recebido, { nome: 'Infra', cor: '#abcdef' });
  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.id, 5);
});

test('criar: nome já em uso entre as ativas é recusado e nada é gravado', async () => {
  const { servico, gravacoes } = criarServicoComRegistro({ validarNome: async () => true });
  await assert.rejects(() => servico.criar({ nome: 'Backend', cor: '#112233' }), BusinessException);
  assert.deepEqual(gravacoes, []);
});

test('criar: confere o nome informado, sem excluir nenhum id', async () => {
  let consulta: unknown;
  const { servico } = criarServicoComRegistro({ validarNome: async (dto: unknown) => { consulta = dto; return false; } });
  await servico.criar({ nome: 'Infra', cor: '#abcdef' });
  assert.deepEqual(consulta, { nome: 'Infra' });
});

test('listar devolve as tags do repositório', async () => {
  const tags = [{ id: 1, nome: 'A', cor: '#000000' }, { id: 2, nome: 'B', cor: '#ffffff' }];
  const { servico } = criarServicoComRegistro({ listar: async () => tags });
  const resposta = await servico.listar();
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(resposta.dados, tags);
});

test('recuperar: inexistente lança ResourceNotFoundException; existente devolve a tag', async () => {
  const ausente = criarServicoComRegistro({ recuperar: async () => null });
  await assert.rejects(() => ausente.servico.recuperar({ id: 9 }), ResourceNotFoundException);
  const { servico } = criarServicoComRegistro();
  assert.equal((await servico.recuperar({ id: 1 })).dados?.nome, 'Backend');
});

test('alterar: tag inexistente lança ResourceNotFoundException e nada é gravado', async () => {
  const { servico, gravacoes } = criarServicoComRegistro({ recuperar: async () => null });
  await assert.rejects(() => servico.alterar({ id: 9, nome: 'Novo' }), ResourceNotFoundException);
  assert.deepEqual(gravacoes, []);
});

test('alterar: nome de outra tag ativa é recusado, sem gravar; a checagem ignora a própria tag', async () => {
  let consulta: unknown;
  const { servico, gravacoes } = criarServicoComRegistro({ validarNome: async (dto: unknown) => { consulta = dto; return true; } });
  await assert.rejects(() => servico.alterar({ id: 1, nome: 'Frontend' }), BusinessException);
  assert.deepEqual(consulta, { nome: 'Frontend', idExcluir: 1 });
  assert.deepEqual(gravacoes, []);
});

test('alterar: só a cor não confere unicidade de nome e repassa só o que veio', async () => {
  let conferiuNome = false;
  let recebido: unknown;
  const { servico } = criarServicoComRegistro({
    validarNome: async () => { conferiuNome = true; return true; },
    alterar: async (dados: unknown) => { recebido = dados; return { id: 1, nome: 'Backend', cor: '#ffffff', createdDate: new Date() }; },
  });
  const resposta = await servico.alterar({ id: 1, cor: '#ffffff' });
  assert.equal(conferiuNome, false);
  assert.deepEqual(recebido, { id: 1, nome: undefined, cor: '#ffffff' });
  assert.equal(resposta.dados?.cor, '#ffffff');
});

test('excluir: inexistente lança ResourceNotFoundException sem excluir; existente faz o soft delete', async () => {
  const ausente = criarServicoComRegistro({ recuperar: async () => null });
  await assert.rejects(() => ausente.servico.excluir({ id: 9 }), ResourceNotFoundException);
  assert.deepEqual(ausente.gravacoes, []);

  const { servico, gravacoes } = criarServicoComRegistro();
  const resposta = await servico.excluir({ id: 1 });
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(gravacoes, ['excluir']);
});

test('restaurar: a checagem de nome usa o nome da tag excluída', async () => {
  let consulta: unknown;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
    validarNome: async (dto: unknown) => { consulta = dto; return false; },
    restaurar: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
  });
  await servico.restaurar({ id: 1 });
  assert.deepEqual(consulta, { nome: 'Backend' });
});
