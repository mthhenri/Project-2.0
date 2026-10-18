import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ExecucaoService } from '../services/execucao.service';
import { DESCRICAO_PAUSA_PARA_INICIAR_OUTRA, IniciarExecucaoExecutor } from './iniciar-execucao.executor';
import { DescreverExecucaoExecutor } from './descrever-execucao.executor';
import { PausarExecucaoExecutor } from './pausar-execucao.executor';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

interface Execucao {
  id: number;
  atividadeId: number;
  descricao: string;
  fimData: Date | null;
  excluida?: boolean;
}

/** `ExecucaoService` em memória, com as regras que os executores usam (uma ativa, encerrar, iniciar, reabrir). */
function criarServico(inicial: Execucao[] = [], opcoes: { falharAoIniciar?: boolean } = {}) {
  const execucoes = inicial.map((execucao) => ({ ...execucao }));
  const chamadas: string[] = [];
  let proximoId = 100;
  const ativaDoUsuario = () => execucoes.find((execucao) => execucao.fimData === null && !execucao.excluida);
  const servico = {
    recuperarAtiva: async () => {
      const ativa = ativaDoUsuario();
      return { dados: ativa ? { id: ativa.id, atividadeId: ativa.atividadeId, descricao: ativa.descricao, inicioData: new Date() } : null };
    },
    encerrar: async (dto: { id: number; descricao: string }) => {
      chamadas.push(`encerrar:${dto.id}:${dto.descricao}`);
      const execucao = execucoes.find((item) => item.id === dto.id)!;
      execucao.fimData = new Date();
      execucao.descricao = dto.descricao;
      return { dados: execucao };
    },
    iniciar: async (dto: { atividadeId: number; descricao: string }) => {
      chamadas.push(`iniciar:${dto.atividadeId}:${dto.descricao}`);
      if (opcoes.falharAoIniciar) throw new BusinessException('Só é possível iniciar execução em atividades planejadas ou em desenvolvimento');
      const nova = { id: proximoId++, atividadeId: dto.atividadeId, descricao: dto.descricao, fimData: null };
      execucoes.push(nova);
      return { dados: nova };
    },
    recuperar: async (dto: { id: number }) => ({ dados: execucoes.find((execucao) => execucao.id === dto.id) }),
    excluir: async (dto: { id: number }) => {
      chamadas.push(`excluir:${dto.id}`);
      execucoes.find((execucao) => execucao.id === dto.id)!.excluida = true;
    },
    alterar: async (dto: { id: number; descricao: string; fimData: null }) => {
      chamadas.push(`reabrir:${dto.id}:${dto.descricao}`);
      const execucao = execucoes.find((item) => item.id === dto.id)!;
      execucao.fimData = dto.fimData;
      execucao.descricao = dto.descricao;
      return { dados: execucao };
    },
  };
  // O executor lê a ativa do DONO da atividade; nos testes o dono é sempre o usuário do token.
  (servico as Record<string, unknown>)['recuperarAtivaDoUsuario'] = servico.recuperarAtiva;
  return { servico: servico as unknown as ExecucaoService, chamadas, execucoes };
}

// ------------------------------------------------------------------ iniciar

/** `AtividadeService` que só registra as mudanças de status pedidas. */
function atividadesEmMemoria(chamadas: string[]) {
  return {
    alterar: async (dto: { id: number; status: string }) => { chamadas.push(`status:${dto.id}:${dto.status}`); return { dados: {} }; },
    recuperar: async () => ({ dados: { usuarioId: 7, nomeUsuario: 'Dev' } }),
  } as unknown as AtividadeService;
}

test('iniciar: com novoStatus muda o status antes de iniciar e devolve o anterior no resultado', async () => {
  const { servico, chamadas } = criarServico();
  const resultado = await new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar(
    { atividadeId: 9, descricao: 'Validar e-mail', novoStatus: 'DESENVOLVENDO', statusAnterior: 'PLANEJADA' }, USUARIO);
  assert.deepEqual(chamadas, ['status:9:DESENVOLVENDO', 'iniciar:9:Validar e-mail']);
  assert.equal(resultado['statusAnterior'], 'PLANEJADA');
});

test('iniciar: se iniciar falha depois de mudar o status, o status volta', async () => {
  const { servico, chamadas } = criarServico([], { falharAoIniciar: true });
  await assert.rejects(new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar(
    { atividadeId: 9, descricao: 'Validar e-mail', novoStatus: 'DESENVOLVENDO', statusAnterior: 'PENDENTE' }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, ['status:9:DESENVOLVENDO', 'iniciar:9:Validar e-mail', 'status:9:PENDENTE']);
});

test('iniciar: desfazer devolve o status anterior da atividade', async () => {
  const { servico, chamadas } = criarServico();
  const executor = new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas));
  const resultado = await executor.executar({ atividadeId: 9, descricao: 'Validar e-mail', novoStatus: 'DESENVOLVENDO', statusAnterior: 'PENDENTE' }, USUARIO);
  chamadas.length = 0;
  await executor.desfazer(resultado, USUARIO);
  assert.deepEqual(chamadas, ['excluir:100', 'status:9:PENDENTE']);
});

test('iniciar: sem outra ativa, só inicia', async () => {
  const { servico, chamadas } = criarServico();
  const resultado = await new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  assert.deepEqual(chamadas, ['iniciar:9:Validar e-mail']);
  assert.equal(resultado['atividadeId'], 9);
  assert.equal(resultado['pausouExecucaoId'], undefined);
});

test('iniciar: com outra ativa, pausa antes com a descrição provisória e inicia a nova', async () => {
  const { servico, chamadas } = criarServico([{ id: 1, atividadeId: 5, descricao: 'Layout do carrinho', fimData: null }]);
  const resultado = await new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  assert.deepEqual(chamadas, ['encerrar:1:Layout do carrinho', 'iniciar:9:Validar e-mail']);
  assert.equal(resultado['pausouExecucaoId'], 1);
});

test('iniciar: a execução pausada sem descrição recebe a descrição padrão de pausa', async () => {
  const { servico, chamadas } = criarServico([{ id: 1, atividadeId: 5, descricao: '  ', fimData: null }]);
  await new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  assert.equal(chamadas[0], `encerrar:1:${DESCRICAO_PAUSA_PARA_INICIAR_OUTRA}`);
});

test('iniciar: a mesma atividade já em execução é recusada sem pausar nada', async () => {
  const { servico, chamadas } = criarServico([{ id: 1, atividadeId: 9, descricao: 'x', fimData: null }]);
  await assert.rejects(new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('iniciar: se iniciar falha depois da pausa, a anterior é reaberta e o erro segue', async () => {
  const { servico, chamadas, execucoes } = criarServico([{ id: 1, atividadeId: 5, descricao: 'Layout do carrinho', fimData: null }], { falharAoIniciar: true });
  await assert.rejects(new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas)).executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, ['encerrar:1:Layout do carrinho', 'iniciar:9:Validar e-mail', 'reabrir:1:Layout do carrinho']);
  assert.equal(execucoes[0].fimData, null);
});

test('iniciar: desfazer exclui a nova (se ainda em andamento) e reabre a que foi pausada', async () => {
  const { servico, chamadas, execucoes } = criarServico([{ id: 1, atividadeId: 5, descricao: 'Layout do carrinho', fimData: null }]);
  const executor = new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas));
  const resultado = await executor.executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  chamadas.length = 0;
  await executor.desfazer(resultado, USUARIO);
  assert.deepEqual(chamadas, ['excluir:100', 'reabrir:1:Layout do carrinho']);
  assert.equal(execucoes.find((execucao) => execucao.id === 1)!.fimData, null);
});

test('iniciar: desfazer é recusado se a execução já foi encerrada', async () => {
  const { servico, chamadas } = criarServico();
  const executor = new IniciarExecucaoExecutor(servico, atividadesEmMemoria(chamadas));
  const resultado = await executor.executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  await servico.encerrar({ id: Number(resultado['execucaoId']), descricao: 'Feito' }, USUARIO);
  chamadas.length = 0;
  await assert.rejects(executor.desfazer(resultado, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('iniciar: os dados são validados (descrição curta, campo desconhecido)', () => {
  const executor = new IniciarExecucaoExecutor(criarServico().servico, atividadesEmMemoria([]));
  assert.doesNotThrow(() => executor.validar({ atividadeId: 9, descricao: 'Validar e-mail', atividadeNome: 'Login' }));
  assert.throws(() => executor.validar({ atividadeId: 9, descricao: 'ab' }), BusinessException);
  assert.throws(() => executor.validar({ atividadeId: 0, descricao: 'Validar e-mail' }), BusinessException);
  assert.throws(() => executor.validar({ atividadeId: 9, descricao: 'Validar e-mail', usuarioId: 1 }), BusinessException);
});

// ------------------------------------------------------------------ pausar

test('pausar: sem execução em andamento é recusado', async () => {
  const { servico } = criarServico();
  await assert.rejects(new PausarExecucaoExecutor(servico).executar({}, USUARIO), BusinessException);
});

test('pausar: usa a descrição da proposta (almoço) ou, sem ela, a provisória', async () => {
  const comDescricao = criarServico([{ id: 1, atividadeId: 5, descricao: 'provisória', fimData: null }]);
  await new PausarExecucaoExecutor(comDescricao.servico).executar({ descricao: 'Correção da validação de e-mail.' }, USUARIO);
  assert.deepEqual(comDescricao.chamadas, ['encerrar:1:Correção da validação de e-mail.']);

  const semDescricao = criarServico([{ id: 1, atividadeId: 5, descricao: 'provisória', fimData: null }]);
  await new PausarExecucaoExecutor(semDescricao.servico).executar({}, USUARIO);
  assert.deepEqual(semDescricao.chamadas, ['encerrar:1:provisória']);
});

test('pausar: sem nenhuma descrição (nem a provisória) pede a descrição e não pausa', async () => {
  const { servico, chamadas } = criarServico([{ id: 1, atividadeId: 5, descricao: '', fimData: null }]);
  await assert.rejects(new PausarExecucaoExecutor(servico).executar({}, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('pausar: desfazer reabre a execução; recusa se já há outra em andamento', async () => {
  const { servico, execucoes } = criarServico([{ id: 1, atividadeId: 5, descricao: 'provisória', fimData: null }]);
  const executor = new PausarExecucaoExecutor(servico);
  const resultado = await executor.executar({ descricao: 'Trabalho feito.' }, USUARIO);
  assert.notEqual(execucoes[0].fimData, null);

  await executor.desfazer(resultado, USUARIO);
  assert.equal(execucoes[0].fimData, null);
  assert.equal(execucoes[0].descricao, 'provisória');

  await executor.executar({ descricao: 'Trabalho feito.' }, USUARIO);
  await servico.iniciar({ atividadeId: 8, descricao: 'outra coisa' }, USUARIO);
  await assert.rejects(executor.desfazer(resultado, USUARIO), BusinessException);
});

test('proposta de iniciar fica obsoleta quando a atividade já está em execução (iniciada à mão)', async () => {
  const dados = { atividadeId: 9, descricao: 'Validar e-mail' };
  const emExecucao = criarServico([{ id: 1, atividadeId: 9, descricao: 'x', fimData: null }]);
  assert.equal(await new IniciarExecucaoExecutor(emExecucao.servico, atividadesEmMemoria([])).estaObsoleta(dados, USUARIO), true);
  const outraAtividade = criarServico([{ id: 1, atividadeId: 5, descricao: 'x', fimData: null }]);
  assert.equal(await new IniciarExecucaoExecutor(outraAtividade.servico, atividadesEmMemoria([])).estaObsoleta(dados, USUARIO), false);
  const semExecucao = criarServico();
  assert.equal(await new IniciarExecucaoExecutor(semExecucao.servico, atividadesEmMemoria([])).estaObsoleta(dados, USUARIO), false);
});

test('proposta de pausar fica obsoleta quando já não há execução em andamento (pausada à mão)', async () => {
  const semExecucao = criarServico();
  assert.equal(await new PausarExecucaoExecutor(semExecucao.servico).estaObsoleta({}, USUARIO), true);
  const emExecucao = criarServico([{ id: 1, atividadeId: 5, descricao: 'x', fimData: null }]);
  assert.equal(await new PausarExecucaoExecutor(emExecucao.servico).estaObsoleta({}, USUARIO), false);
});

test('proposta de descrever fica obsoleta quando a execução a que se refere já não é a em andamento', async () => {
  const dados = { descricao: 'Validei o e-mail do cadastro', escolha: 'CONTINUAR', execucaoId: 1 };
  const mesma = criarServico([{ id: 1, atividadeId: 5, descricao: 'x', fimData: null }]);
  assert.equal(await new DescreverExecucaoExecutor(mesma.servico).estaObsoleta(dados, USUARIO), false);
  const outra = criarServico([{ id: 2, atividadeId: 5, descricao: 'x', fimData: null }]);
  assert.equal(await new DescreverExecucaoExecutor(outra.servico).estaObsoleta(dados, USUARIO), true);
  const nenhuma = criarServico();
  assert.equal(await new DescreverExecucaoExecutor(nenhuma.servico).estaObsoleta(dados, USUARIO), true);
});
