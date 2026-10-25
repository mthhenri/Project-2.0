import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DesconectarDemandaExecutor } from '../executores/desconectar-demanda.executor';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';
import { ProporDesconectarDemandaFerramenta } from './propor-desconectar-demanda.ferramenta';

// Desconectar demandas (task 230): a ferramenta só cria a proposta (gestor); o executor remove pela service com o token e o desfazer recria
// a conexão pela service (que recusa repetida e ciclo). As demandas nunca mudam de lugar.

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function montar(opcoes: { conexaoExiste?: boolean; ehBidirecional?: boolean; criarFalha?: string } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const exclusoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  const criacoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  let existe = opcoes.conexaoExiste ?? true;
  const demandas: Record<number, { id: number; nome: string }> = { 3: { id: 3, nome: 'API' }, 4: { id: 4, nome: 'Tela' } };
  const demandaRepositorio = {
    recuperar: async ({ id }: { id: number }) => demandas[id] ?? null,
    recuperarConexaoPorPar: async () => (existe ? { id: 55, demandaOrigemId: 3, demandaDestinoId: 4, ehBidirecional: opcoes.ehBidirecional ?? false } : null),
  } as unknown as DemandaRepository;
  const demandaService = {
    excluirConexao: async (dto: Record<string, unknown>, usuario: unknown) => {
      if ((usuario as { tipo: TipoUsuarioEnum }).tipo !== TipoUsuarioEnum.GESTOR) throw new UnauthorizedAccessException('Apenas gestores desconectam demandas');
      exclusoes.push({ dto, usuario });
      existe = false;
      return { dados: null };
    },
    criarConexao: async (dto: Record<string, unknown>, usuario: unknown) => {
      if (opcoes.criarFalha) throw new BusinessException(opcoes.criarFalha);
      criacoes.push({ dto, usuario });
      existe = true;
      return { dados: { id: 56 } };
    },
  } as unknown as DemandaService;
  const propostaIa = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 80, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  return {
    ferramenta: new ProporDesconectarDemandaFerramenta(propostaIa, demandaRepositorio),
    executor: new DesconectarDemandaExecutor(demandaService, demandaRepositorio),
    propostas, exclusoes, criacoes,
  };
}

test('propor: guarda o par, os nomes e o sentido da conexão, sem remover nada; é ferramenta só do gestor', async () => {
  const { ferramenta, propostas, exclusoes } = montar({ ehBidirecional: true });
  assert.equal(ferramenta.permissao, 'GESTOR');
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.DESCONECTAR_DEMANDA);
  await ferramenta.executar({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR);
  assert.deepEqual(propostas[0].dados, { demandaOrigemId: 3, demandaDestinoId: 4, demandaOrigemNome: 'API', demandaDestinoNome: 'Tela', ehBidirecional: true });
  assert.deepEqual(exclusoes, []);
});

test('propor: mesma demanda, demanda inexistente e conexão que não existe são recusadas sem proposta', async () => {
  const cenario = montar();
  await assert.rejects(() => cenario.ferramenta.executar({ demandaOrigemId: 3, demandaDestinoId: 3 }, GESTOR), BusinessException);
  await assert.rejects(() => cenario.ferramenta.executar({ demandaOrigemId: 9, demandaDestinoId: 4 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => cenario.ferramenta.executar({ demandaOrigemId: 3, demandaDestinoId: 9 }, GESTOR), ResourceNotFoundException);
  const sem = montar({ conexaoExiste: false });
  await assert.rejects(() => sem.ferramenta.executar({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR), BusinessException);
  assert.equal(cenario.propostas.length + sem.propostas.length, 0);
});

test('executar: remove a conexão pela service com o usuário do token e guarda o sentido para o desfazer', async () => {
  const { executor, exclusoes } = montar({ ehBidirecional: true });
  const resultado = await executor.executar({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR);
  assert.deepEqual(exclusoes, [{ dto: { demandaId: 3, conexaoId: 55 }, usuario: GESTOR }]);
  assert.deepEqual(resultado, { demandaOrigemId: 3, demandaDestinoId: 4, ehBidirecional: true });
});

test('executar: desenvolvedor não desconecta (a service recusa) e conexão que já não existe é recusada', async () => {
  const { executor, exclusoes } = montar();
  await assert.rejects(() => executor.executar({ demandaOrigemId: 3, demandaDestinoId: 4 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(exclusoes, []);
  const sem = montar({ conexaoExiste: false });
  await assert.rejects(() => sem.executor.executar({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR), BusinessException);
});

test('desfazer: recria a conexão pela service, no mesmo sentido; repetida ou em ciclo a service recusa e nada é criado', async () => {
  const feito = montar();
  await feito.executor.desfazer({ demandaOrigemId: 3, demandaDestinoId: 4, ehBidirecional: true }, GESTOR);
  assert.deepEqual(feito.criacoes, [{ dto: { demandaOrigemId: 3, demandaDestinoId: 4, ehBidirecional: true }, usuario: GESTOR }]);

  const ciclo = montar({ criarFalha: 'Essa conexão criaria um ciclo no grafo de demandas' });
  await assert.rejects(() => ciclo.executor.desfazer({ demandaOrigemId: 3, demandaDestinoId: 4, ehBidirecional: false }, GESTOR), BusinessException);
  assert.deepEqual(ciclo.criacoes, []);
  await assert.rejects(() => feito.executor.desfazer({}, GESTOR), BusinessException);
});

test('validar: dados inválidos são recusados; obsoleta quando a conexão já não existe', async () => {
  const { executor } = montar();
  assert.doesNotThrow(() => executor.validar({ demandaOrigemId: 3, demandaDestinoId: 4, demandaOrigemNome: 'API' }));
  assert.throws(() => executor.validar({ demandaOrigemId: 0, demandaDestinoId: 4 }), BusinessException);
  assert.throws(() => executor.validar({ demandaOrigemId: 3, demandaDestinoId: 4, campoInventado: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR), false);
  assert.equal(await montar({ conexaoExiste: false }).executor.estaObsoleta({ demandaOrigemId: 3, demandaDestinoId: 4 }, GESTOR), true);
});
