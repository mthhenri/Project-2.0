import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ExecucaoService } from '../services/execucao.service';
import { DESCRICAO_CONTINUACAO, DESCRICAO_INICIO_DA_SEGUINTE, DescreverExecucaoExecutor } from './descrever-execucao.executor';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const DESCRICAO = 'Correção da validação de e-mail duplicado no cadastro.';

interface Execucao {
  id: number;
  atividadeId: number;
  descricao: string;
  fimData: Date | null;
  excluida?: boolean;
}

function criarServico(inicial: Execucao[], opcoes: { falharAoIniciar?: boolean } = {}) {
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
  return { executor: new DescreverExecucaoExecutor(servico as unknown as ExecucaoService), chamadas, execucoes, servico: servico as unknown as ExecucaoService };
}

const ATIVA: Execucao = { id: 1, atividadeId: 5, descricao: 'Validar e-mail', fimData: null };

test('continuar: encerra a execução com a descrição formal e abre o trecho seguinte na mesma atividade', async () => {
  const { executor, chamadas } = criarServico([ATIVA]);
  const resultado = await executor.executar({ descricao: DESCRICAO, escolha: 'CONTINUAR', execucaoId: 1 }, USUARIO);
  assert.deepEqual(chamadas, [`encerrar:1:${DESCRICAO}`, `iniciar:5:${DESCRICAO_CONTINUACAO}`]);
  assert.equal(resultado['execucaoDescritaId'], 1);
  assert.equal(resultado['descricaoAnterior'], 'Validar e-mail');
});

test('trocar: o trecho seguinte abre na outra atividade, com a descrição provisória da proposta ou a padrão', async () => {
  const comDescricao = criarServico([ATIVA]);
  await comDescricao.executor.executar({ descricao: DESCRICAO, escolha: 'TROCAR', atividadeSeguinteId: 9, descricaoSeguinte: 'Revisar o PR do carrinho' }, USUARIO);
  assert.deepEqual(comDescricao.chamadas, [`encerrar:1:${DESCRICAO}`, 'iniciar:9:Revisar o PR do carrinho']);

  const padrao = criarServico([ATIVA]);
  await padrao.executor.executar({ descricao: DESCRICAO, escolha: 'TROCAR', atividadeSeguinteId: 9 }, USUARIO);
  assert.equal(padrao.chamadas[1], `iniciar:9:${DESCRICAO_INICIO_DA_SEGUINTE}`);
});

test('trocar exige a atividade seguinte e não aceita a mesma da execução', async () => {
  const { executor, chamadas } = criarServico([ATIVA]);
  assert.throws(() => executor.validar({ descricao: DESCRICAO, escolha: 'TROCAR' }), BusinessException);
  await assert.rejects(executor.executar({ descricao: DESCRICAO, escolha: 'TROCAR', atividadeSeguinteId: 5 }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('sem execução em andamento, ou com a execução já trocada desde a proposta, nada é encerrado', async () => {
  const sem = criarServico([]);
  await assert.rejects(sem.executor.executar({ descricao: DESCRICAO, escolha: 'CONTINUAR' }, USUARIO), BusinessException);
  const velha = criarServico([ATIVA]);
  await assert.rejects(velha.executor.executar({ descricao: DESCRICAO, escolha: 'CONTINUAR', execucaoId: 99 }, USUARIO), BusinessException);
  assert.deepEqual(velha.chamadas, []);
});

test('se abrir o trecho seguinte falha, a execução é reaberta e o erro segue', async () => {
  const { executor, chamadas, execucoes } = criarServico([ATIVA], { falharAoIniciar: true });
  await assert.rejects(executor.executar({ descricao: DESCRICAO, escolha: 'TROCAR', atividadeSeguinteId: 9 }, USUARIO), BusinessException);
  assert.deepEqual(chamadas, [`encerrar:1:${DESCRICAO}`, `iniciar:9:${DESCRICAO_INICIO_DA_SEGUINTE}`, 'reabrir:1:Validar e-mail']);
  assert.equal(execucoes[0].fimData, null);
  assert.equal(execucoes[0].descricao, 'Validar e-mail');
});

test('desfazer exclui o trecho novo e reabre a execução descrita com a descrição provisória de antes', async () => {
  const { executor, chamadas, execucoes } = criarServico([ATIVA]);
  const resultado = await executor.executar({ descricao: DESCRICAO, escolha: 'CONTINUAR' }, USUARIO);
  chamadas.length = 0;
  await executor.desfazer(resultado, USUARIO);
  assert.deepEqual(chamadas, ['excluir:100', 'reabrir:1:Validar e-mail']);
  assert.equal(execucoes.find((execucao) => execucao.id === 1)!.fimData, null);
});

test('desfazer é recusado se o trecho seguinte já foi encerrado', async () => {
  const { executor, chamadas, servico } = criarServico([ATIVA]);
  const resultado = await executor.executar({ descricao: DESCRICAO, escolha: 'CONTINUAR' }, USUARIO);
  await servico.encerrar({ id: Number(resultado['novaExecucaoId']), descricao: 'Feito' }, USUARIO);
  chamadas.length = 0;
  await assert.rejects(executor.desfazer(resultado, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('os dados são validados (descrição curta, escolha inexistente, campo desconhecido, caractere proibido)', () => {
  const { executor } = criarServico([ATIVA]);
  assert.doesNotThrow(() => executor.validar({ descricao: DESCRICAO, escolha: 'CONTINUAR', atividadeNome: 'Login', minutos: 30 }));
  assert.throws(() => executor.validar({ descricao: 'ab', escolha: 'CONTINUAR' }), BusinessException);
  assert.throws(() => executor.validar({ descricao: DESCRICAO, escolha: 'PAUSAR' }), BusinessException);
  assert.throws(() => executor.validar({ descricao: DESCRICAO, escolha: 'CONTINUAR', usuarioId: 2 }), BusinessException);
  assert.throws(() => executor.validar({ descricao: 'Campo "e-mail" validado', escolha: 'CONTINUAR' }), BusinessException);
});
