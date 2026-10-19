import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CalendarioService } from './calendario.service';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// A permissão de gestor mora no controller (@GestorOnly; ver o teste dele): a service não recebe usuário, então aqui
// se prova o que ela decide — existência, repasse dos campos e que nada é gravado quando a regra recusa.
// O repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): CalendarioService {
  const servico = Object.create(CalendarioService.prototype) as Record<string, unknown>;
  servico.calendarioRepositorio = repositorio;
  return servico as unknown as CalendarioService;
}

const NATAL = { id: 1, diaData: '2026-12-25', descricao: 'Natal', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: true };

/** Repository que devolve `registrado` em `recuperar`/`recuperarTipo` e anota cada chamada como `nome:argumento`. */
function repositorioComRegistro(registrado: unknown, chamadas: string[] = []) {
  const registrar = (nome: string, retorno: unknown) => async (...argumentos: unknown[]) => {
    chamadas.push(`${nome}:${JSON.stringify(argumentos[0])}`);
    return retorno;
  };
  return {
    inserir: registrar('inserir', NATAL),
    listar: registrar('listar', [NATAL]),
    recuperar: registrar('recuperar', registrado),
    alterar: registrar('alterar', { ...NATAL, descricao: 'Novo' }),
    excluir: registrar('excluir', undefined),
    recuperarTipo: registrar('recuperarTipo', registrado),
  };
}

const gravacoes = (chamadas: string[], nome: string) => chamadas.filter((chamada) => chamada.startsWith(`${nome}:`));

test('restaurar: dia não útil inexistente entre os excluídos lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluido: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: reativa o dia não útil excluído', async () => {
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, diaData: '2026-12-25', descricao: 'Natal' }),
    restaurar: async () => ({ id: 1, diaData: '2026-12-25', descricao: 'Natal' }),
  });
  assert.equal((await servico.restaurar({ id: 1 })).dados?.descricao, 'Natal');
});

test('restaurar: não reativa nada quando o dia não está entre os excluídos', async () => {
  let restaurou = false;
  const servico = criarServico({ recuperarExcluido: async () => null, restaurar: async () => { restaurou = true; } });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
  assert.equal(restaurou, false);
});

test('criar: repassa ao repository só os campos do cadastro', async () => {
  const chamadas: string[] = [];
  const servico = criarServico(repositorioComRegistro(null, chamadas));
  const resposta = await servico.criar({ diaData: '2026-12-25', descricao: 'Natal', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: true } as never);
  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.descricao, 'Natal');
  assert.deepEqual(chamadas, [`inserir:${JSON.stringify({ diaData: '2026-12-25', descricao: 'Natal', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: true })}`]);
});

test('criar: tipo e duração são independentes (feriado de meio período e recesso integral)', async () => {
  const recebidos: unknown[] = [];
  const servico = criarServico({ inserir: async (dados: unknown) => { recebidos.push(dados); return NATAL; } });
  await servico.criar({ diaData: '2026-03-10', descricao: 'A', tipo: 'FERIADO', duracao: 'MEIO_PERIODO', recorrente: false } as never);
  await servico.criar({ diaData: '2026-03-11', descricao: 'B', tipo: 'RECESSO', duracao: 'INTEGRAL', recorrente: false } as never);
  assert.deepEqual(recebidos.map((dados) => [(dados as any).tipo, (dados as any).duracao]), [['FERIADO', 'MEIO_PERIODO'], ['RECESSO', 'INTEGRAL']]);
});

test('listar: devolve o que o repository lista', async () => {
  const resposta = await criarServico(repositorioComRegistro(null)).listar();
  assert.deepEqual(resposta.dados, [NATAL]);
});

test('recuperar: existente volta; inexistente lança ResourceNotFoundException', async () => {
  assert.equal((await criarServico(repositorioComRegistro(NATAL)).recuperar({ id: 1 })).dados?.id, 1);
  await assert.rejects(() => criarServico(repositorioComRegistro(null)).recuperar({ id: 9 }), ResourceNotFoundException);
});

test('alterar: inexistente lança ResourceNotFoundException e nada é gravado', async () => {
  const chamadas: string[] = [];
  await assert.rejects(() => criarServico(repositorioComRegistro(null, chamadas)).alterar({ id: 9, descricao: 'X' }), ResourceNotFoundException);
  assert.deepEqual(gravacoes(chamadas, 'alterar'), []);
});

test('alterar: repassa o id e os campos informados, sem a data (ela não se altera)', async () => {
  const chamadas: string[] = [];
  const resposta = await criarServico(repositorioComRegistro(NATAL, chamadas)).alterar({ id: 1, descricao: 'Novo', duracao: 'MEIO_PERIODO' } as never);
  assert.equal(resposta.dados?.descricao, 'Novo');
  const alteracao = JSON.parse(gravacoes(chamadas, 'alterar')[0].slice('alterar:'.length));
  assert.equal(alteracao.id, 1);
  assert.equal(alteracao.duracao, 'MEIO_PERIODO');
  assert.equal('diaData' in alteracao, false);
});

test('excluir: inexistente lança ResourceNotFoundException sem excluir; existente exclui pelo id', async () => {
  const semRegistro: string[] = [];
  await assert.rejects(() => criarServico(repositorioComRegistro(null, semRegistro)).excluir({ id: 9 }), ResourceNotFoundException);
  assert.deepEqual(gravacoes(semRegistro, 'excluir'), []);

  const comRegistro: string[] = [];
  const resposta = await criarServico(repositorioComRegistro(NATAL, comRegistro)).excluir({ id: 1 });
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(gravacoes(comRegistro, 'excluir'), ['excluir:{"id":1}']);
});

// verificarDiaUtil: fim de semana é ignorado sem consultar o banco; o resto cruza com dia_nao_util.

test('verificarDiaUtil: sábado e domingo não são úteis e nem consultam o calendário', async () => {
  let consultou = false;
  const servico = criarServico({ recuperarTipo: async () => { consultou = true; return null; } });
  for (const data of ['2026-12-26', '2026-12-27']) {
    const resposta = await servico.verificarDiaUtil(data);
    assert.deepEqual(resposta.dados, { data, ehDiaUtil: false, motivo: 'Fim de semana' });
  }
  assert.equal(consultou, false);
});

test('verificarDiaUtil: dia não útil integral devolve o tipo como motivo', async () => {
  const servico = criarServico({ recuperarTipo: async () => ({ tipo: 'FERIADO', duracao: 'INTEGRAL', descricao: 'Natal' }) });
  assert.deepEqual((await servico.verificarDiaUtil('2026-12-25')).dados, { data: '2026-12-25', ehDiaUtil: false, motivo: 'FERIADO' });
});

test('verificarDiaUtil: meio período marca o motivo com "(meio período)"', async () => {
  const servico = criarServico({ recuperarTipo: async () => ({ tipo: 'RECESSO', duracao: 'MEIO_PERIODO', descricao: 'Recesso' }) });
  assert.equal((await servico.verificarDiaUtil('2026-12-24')).dados?.motivo, 'RECESSO (meio período)');
});

test('verificarDiaUtil: dia de semana sem cadastro é útil', async () => {
  const servico = criarServico({ recuperarTipo: async () => null });
  assert.deepEqual((await servico.verificarDiaUtil('2026-12-23')).dados, { data: '2026-12-23', ehDiaUtil: true, motivo: null });
});
