import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { ProjetoService } from './projeto.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// Complemento do projeto.service.test.ts (que cobre restaurar): criar, listar, recuperar, alterar e excluir.
// A permissão de criar/alterar/excluir é do `@GestorOnly` do controller (ver projeto.controller.test.ts), não da service.

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'a', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criarServico(repositorio: Record<string, unknown>): ProjetoService {
  const servico = Object.create(ProjetoService.prototype) as Record<string, unknown>;
  servico.projetoRepositorio = repositorio;
  return servico as unknown as ProjetoService;
}

const DADOS_CRIAR = { nome: 'Projeto A', codigo: 'PA', cor: '#336699', status: TipoProjetoStatusEnum.ATIVO };

const PROJETO = {
  id: 10, nome: 'Projeto A', codigo: 'PA', cor: '#336699', status: TipoProjetoStatusEnum.ATIVO,
  inicioData: '2026-01-01', previsaoFimData: '2026-06-30', createdDate: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// criar
// ---------------------------------------------------------------------------

test('criar: código já usado entre os ativos é recusado e nada é gravado', async () => {
  let inseriu = false;
  const servico = criarServico({ validarCodigo: async () => true, inserir: async () => { inseriu = true; } });
  await assert.rejects(() => servico.criar(DADOS_CRIAR), (erro: BusinessException) => {
    assert.equal((erro.getResponse() as { mensagem: string }).mensagem, 'Código de projeto já está em uso');
    return true;
  });
  assert.equal(inseriu, false);
});

test('criar: previsão de fim igual ou anterior ao início é recusada', async () => {
  let inseriu = false;
  const servico = criarServico({ validarCodigo: async () => false, inserir: async () => { inseriu = true; } });
  for (const previsaoFimData of ['2026-01-01', '2025-12-31']) {
    await assert.rejects(() => servico.criar({ ...DADOS_CRIAR, inicioData: '2026-01-01', previsaoFimData }), BusinessException, previsaoFimData);
  }
  assert.equal(inseriu, false);
});

test('criar: datas ausentes viram null e uma só das datas não aciona a validação', async () => {
  const gravados: Array<Record<string, unknown>> = [];
  const servico = criarServico({ validarCodigo: async () => false, inserir: async (dados: Record<string, unknown>) => { gravados.push(dados); return PROJETO; } });
  await servico.criar(DADOS_CRIAR);
  await servico.criar({ ...DADOS_CRIAR, previsaoFimData: '2026-06-30' });
  assert.deepEqual([gravados[0].inicioData, gravados[0].previsaoFimData], [null, null]);
  assert.deepEqual([gravados[1].inicioData, gravados[1].previsaoFimData], [null, '2026-06-30']);
});

test('criar: grava os campos informados e responde com o projeto criado', async () => {
  let gravado: Record<string, unknown> | undefined;
  const servico = criarServico({ validarCodigo: async () => false, inserir: async (dados: Record<string, unknown>) => { gravado = dados; return PROJETO; } });
  const resposta = await servico.criar({ ...DADOS_CRIAR, inicioData: '2026-01-01', previsaoFimData: '2026-06-30' });
  assert.deepEqual(gravado, { ...DADOS_CRIAR, inicioData: '2026-01-01', previsaoFimData: '2026-06-30', volumeEsperadoHorasMes: null });
  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.id, 10);
});

test('criar: o volume esperado informado é gravado; sem ele, nulo', async () => {
  const gravados: Array<Record<string, unknown>> = [];
  const servico = criarServico({ validarCodigo: async () => false, inserir: async (dados: Record<string, unknown>) => { gravados.push(dados); return PROJETO; } });
  await servico.criar({ ...DADOS_CRIAR, volumeEsperadoHorasMes: 40 });
  await servico.criar(DADOS_CRIAR);
  assert.deepEqual(gravados.map((dados) => dados.volumeEsperadoHorasMes), [40, null]);
});

test('alterar: o volume esperado vai ao repository, e null limpa o valor', async () => {
  const alterados: Array<Record<string, unknown>> = [];
  const servico = criarServico({ recuperar: async () => PROJETO, alterar: async (dados: Record<string, unknown>) => { alterados.push(dados); return PROJETO; } });
  await servico.alterar({ id: 10, volumeEsperadoHorasMes: 80 });
  await servico.alterar({ id: 10, volumeEsperadoHorasMes: null });
  await servico.alterar({ id: 10, nome: 'Outro' });
  assert.deepEqual(alterados.map((dados) => dados.volumeEsperadoHorasMes), [80, null, undefined]);
});

// ---------------------------------------------------------------------------
// listarVolume (task 197)
// ---------------------------------------------------------------------------

test('listarVolume: o mês vira o intervalo de datas e a lista do repository volta como veio', async () => {
  let recebido: unknown;
  const itens = [{ projetoId: 10, nome: 'Projeto A', codigo: 'PA', cor: '#336699', minutosGastos: 720, volumeEsperadoHorasMes: 40 }];
  const servico = criarServico({ listarVolume: async (filtros: unknown) => { recebido = filtros; return itens; } });
  const resposta = await servico.listarVolume({ ano: 2028, mes: 2 });
  assert.deepEqual(recebido, { dataInicio: '2028-02-01', dataFim: '2028-02-29' });
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(resposta.dados, itens);
});

// ---------------------------------------------------------------------------
// listar: "Ver todos os projetos" (§14) é do gestor e do administrador; o desenvolvedor vê os seus
// ---------------------------------------------------------------------------

function repositorioDeListagem() {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  return {
    chamadas,
    listarTodos: async (filtros: unknown) => { chamadas.push({ metodo: 'listarTodos', argumento: filtros }); return { itens: [{ id: 1 }, { id: 2 }], total: 45 }; },
    listarPorUsuario: async (dto: unknown) => { chamadas.push({ metodo: 'listarPorUsuario', argumento: dto }); return { itens: [{ id: 1 }], total: 1 }; },
  };
}

test('listar: gestor e administrador veem todos (listarTodos), sem filtrar por usuário', async () => {
  for (const usuario of [GESTOR, ADMINISTRADOR]) {
    const repositorio = repositorioDeListagem();
    await criarServico(repositorio).listar({}, usuario);
    assert.deepEqual(repositorio.chamadas.map((chamada) => chamada.metodo), ['listarTodos']);
  }
});

test('listar: desenvolvedor só vê os projetos dele, pelo id do token', async () => {
  const repositorio = repositorioDeListagem();
  await criarServico(repositorio).listar({ status: TipoProjetoStatusEnum.ATIVO }, DESENVOLVEDOR);
  assert.deepEqual(repositorio.chamadas, [{ metodo: 'listarPorUsuario', argumento: { usuarioId: 3, filtros: { status: TipoProjetoStatusEnum.ATIVO } } }]);
});

test('listar: calcula as páginas; sem paginação usa a página 1 de 20; allRows devolve tudo em uma página', async () => {
  const servico = criarServico(repositorioDeListagem());
  const paginada = (await servico.listar({ pagina: 2, itensPorPagina: 20 }, GESTOR)).dados!;
  assert.deepEqual([paginada.totalItens, paginada.paginaAtual, paginada.itensPorPagina, paginada.totalPaginas], [45, 2, 20, 3]);
  const padrao = (await servico.listar({}, GESTOR)).dados!;
  assert.deepEqual([padrao.paginaAtual, padrao.itensPorPagina], [1, 20]);
  const tudo = (await servico.listar({ allRows: true }, GESTOR)).dados!;
  assert.deepEqual([tudo.totalItens, tudo.paginaAtual, tudo.totalPaginas], [2, 1, 1]);
});

// ---------------------------------------------------------------------------
// recuperar
// ---------------------------------------------------------------------------

test('recuperar: projeto inexistente ou excluído lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperar: async () => null });
  await assert.rejects(() => servico.recuperar({ id: 99 }, GESTOR), ResourceNotFoundException);
});

test('recuperar: gestor e administrador veem qualquer projeto sem consultar o acesso por demanda', async () => {
  let consultouAcesso = false;
  const servico = criarServico({ recuperar: async () => PROJETO, validarAcesso: async () => { consultouAcesso = true; return false; } });
  for (const usuario of [GESTOR, ADMINISTRADOR]) assert.equal((await servico.recuperar({ id: 10 }, usuario)).dados?.id, 10);
  assert.equal(consultouAcesso, false);
});

test('recuperar: desenvolvedor sem demanda no projeto recebe 404 (não revela que o projeto existe)', async () => {
  const servico = criarServico({ recuperar: async () => PROJETO, validarAcesso: async () => false });
  await assert.rejects(() => servico.recuperar({ id: 10 }, DESENVOLVEDOR), ResourceNotFoundException);
});

test('recuperar: desenvolvedor com demanda no projeto o recupera', async () => {
  const consultas: unknown[] = [];
  const servico = criarServico({ recuperar: async () => PROJETO, validarAcesso: async (dto: unknown) => { consultas.push(dto); return true; } });
  assert.equal((await servico.recuperar({ id: 10 }, DESENVOLVEDOR)).dados?.id, 10);
  assert.deepEqual(consultas, [{ usuarioId: 3, projetoId: 10 }]);
});

// ---------------------------------------------------------------------------
// alterar e excluir
// ---------------------------------------------------------------------------

test('alterar: projeto inexistente lança ResourceNotFoundException e não grava', async () => {
  let gravou = false;
  const servico = criarServico({ recuperar: async () => null, alterar: async () => { gravou = true; } });
  await assert.rejects(() => servico.alterar({ id: 99, nome: 'X' }), ResourceNotFoundException);
  assert.equal(gravou, false);
});

test('alterar: valida as datas contra as que já existem, inclusive mudando só uma delas', async () => {
  let gravou = false;
  const servico = criarServico({ recuperar: async () => PROJETO, alterar: async () => { gravou = true; return PROJETO; } });
  await assert.rejects(() => servico.alterar({ id: 10, previsaoFimData: '2025-12-31' }), BusinessException);
  await assert.rejects(() => servico.alterar({ id: 10, inicioData: '2026-07-01' }), BusinessException);
  assert.equal(gravou, false);
  await servico.alterar({ id: 10, inicioData: '2026-02-01' });
  assert.equal(gravou, true);
});

test('alterar: repassa só os campos alteráveis; o código nunca vai ao repository', async () => {
  let recebido: Record<string, unknown> | undefined;
  const servico = criarServico({ recuperar: async () => PROJETO, alterar: async (dto: Record<string, unknown>) => { recebido = dto; return PROJETO; } });
  await servico.alterar({ id: 10, nome: 'Novo', cor: '#000000', status: TipoProjetoStatusEnum.PAUSADO, codigo: 'OUTRO' } as never);
  assert.equal('codigo' in recebido!, false);
  assert.deepEqual(
    { id: recebido!.id, nome: recebido!.nome, cor: recebido!.cor, status: recebido!.status },
    { id: 10, nome: 'Novo', cor: '#000000', status: TipoProjetoStatusEnum.PAUSADO },
  );
});

test('excluir: faz soft delete pelo repository; inexistente lança ResourceNotFoundException', async () => {
  const excluidos: number[] = [];
  const servico = criarServico({ recuperar: async ({ id }: { id: number }) => (id === 10 ? PROJETO : null), excluir: async ({ id }: { id: number }) => { excluidos.push(id); } });
  assert.equal((await servico.excluir({ id: 10 })).sucesso, true);
  await assert.rejects(() => servico.excluir({ id: 99 }), ResourceNotFoundException);
  assert.deepEqual(excluidos, [10]);
});
