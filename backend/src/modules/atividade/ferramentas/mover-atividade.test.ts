import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { MoverAtividadeExecutor } from '../executores/mover-atividade.executor';
import { AtividadeService } from '../services/atividade.service';
import { ProporMoverAtividadeFerramenta } from './propor-mover-atividade.ferramenta';

// Mover atividade (task 229): a ferramenta só cria a proposta (dono ou gestor, destino em aberto e diferente); o executor muda pela service com o
// token e o desfazer só devolve à origem se a atividade ainda está no destino.

const DONO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const OUTRO = { sub: 8, login: 'outro', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

/** `HttpException.message` não traz o texto da resposta; o texto do usuário está em `getResponse().mensagem`. */
const contem = (trecho: string) => (erro: unknown) => String(((erro as BusinessException).getResponse() as { mensagem: string }).mensagem).includes(trecho);

function montar(opcoes: { demandaDaAtividade?: number; statusDestino?: TipoDemandaStatusEnum; destinoExiste?: boolean } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const alteracoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  const atividade = { id: 5, nome: 'Montar formulário', demandaId: opcoes.demandaDaAtividade ?? 3, usuarioId: 7 };
  const atividadeService = {
    recuperar: async () => ({ dados: atividade }),
    alterar: async (dto: Record<string, unknown>, usuario: unknown) => {
      alteracoes.push({ dto, usuario });
      if (typeof dto['demandaId'] === 'number') atividade.demandaId = dto['demandaId'];
      return { dados: {} };
    },
  } as unknown as AtividadeService;
  const demandas: Record<number, { id: number; nome: string; status: string }> = {
    3: { id: 3, nome: 'Autenticação', status: 'PENDENTE' },
    4: { id: 4, nome: 'Relatórios', status: opcoes.statusDestino ?? 'PENDENTE' },
  };
  const demandaRepositorio = { recuperar: async ({ id }: { id: number }) => (id === 4 && opcoes.destinoExiste === false ? null : demandas[id] ?? null) } as unknown as DemandaRepository;
  const propostaIa = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 70, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  return {
    ferramenta: new ProporMoverAtividadeFerramenta(propostaIa, atividadeService, demandaRepositorio),
    executor: new MoverAtividadeExecutor(atividadeService),
    propostas, alteracoes, atividade,
  };
}

const DADOS = { atividadeId: 5, demandaDestinoId: 4, demandaOrigemId: 3, atividadeNome: 'Montar formulário', demandaOrigemNome: 'Autenticação', demandaDestinoNome: 'Relatórios' };

test('propor: guarda de onde para onde com os nomes, sem mover nada; é ferramenta de qualquer usuário', async () => {
  const { ferramenta, propostas, alteracoes } = montar();
  assert.equal(ferramenta.permissao, 'QUALQUER');
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.MOVER_ATIVIDADE);
  await ferramenta.executar({ atividadeId: 5, demandaDestinoId: 4 }, DONO);
  assert.deepEqual(propostas[0].dados, DADOS);
  assert.deepEqual(alteracoes, []);
});

test('propor: o gestor propõe mover a atividade de outra pessoa', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ atividadeId: 5, demandaDestinoId: 4 }, GESTOR);
  assert.equal(propostas.length, 1);
});

test('propor: quem não é o dono nem gestor, destino igual, inexistente, concluído ou cancelado são recusados sem proposta', async () => {
  const sem = montar();
  await assert.rejects(() => sem.ferramenta.executar({ atividadeId: 5, demandaDestinoId: 4 }, OUTRO), BusinessException);
  await assert.rejects(() => sem.ferramenta.executar({ atividadeId: 5, demandaDestinoId: 3 }, DONO), contem('já está nessa demanda'));
  assert.equal(sem.propostas.length, 0);

  await assert.rejects(() => montar({ destinoExiste: false }).ferramenta.executar({ atividadeId: 5, demandaDestinoId: 4 }, DONO), ResourceNotFoundException);
  for (const statusDestino of [TipoDemandaStatusEnum.CONCLUIDA, TipoDemandaStatusEnum.CANCELADA]) {
    const cenario = montar({ statusDestino });
    await assert.rejects(() => cenario.ferramenta.executar({ atividadeId: 5, demandaDestinoId: 4 }, DONO), contem('escolha uma demanda em aberto'));
    assert.equal(cenario.propostas.length, 0);
  }
});

test('executar: muda pela service com o usuário do token e guarda a origem para o desfazer', async () => {
  const { executor, alteracoes } = montar();
  const resultado = await executor.executar(DADOS, DONO);
  assert.deepEqual(alteracoes, [{ dto: { id: 5, demandaId: 4 }, usuario: DONO }]);
  assert.deepEqual(resultado, { atividadeId: 5, demandaOrigemId: 3, demandaDestinoId: 4 });
});

test('executar: a atividade que já saiu da demanda de origem da proposta é recusada e nada muda', async () => {
  const { executor, alteracoes } = montar({ demandaDaAtividade: 9 });
  await assert.rejects(() => executor.executar(DADOS, DONO), BusinessException);
  assert.deepEqual(alteracoes, []);
});

test('desfazer: devolve à demanda de origem; recusa se a atividade mudou de demanda depois', async () => {
  const feito = montar({ demandaDaAtividade: 4 });
  await feito.executor.desfazer({ atividadeId: 5, demandaOrigemId: 3, demandaDestinoId: 4 }, DONO);
  assert.deepEqual(feito.alteracoes, [{ dto: { id: 5, demandaId: 3 }, usuario: DONO }]);

  const mudou = montar({ demandaDaAtividade: 9 });
  await assert.rejects(() => mudou.executor.desfazer({ atividadeId: 5, demandaOrigemId: 3, demandaDestinoId: 4 }, DONO), BusinessException);
  assert.deepEqual(mudou.alteracoes, []);
  await assert.rejects(() => mudou.executor.desfazer({}, DONO), BusinessException);
});

test('validar: dados inválidos e destino igual à origem são recusados; obsoleta quando já está no destino', async () => {
  const { executor } = montar();
  assert.doesNotThrow(() => executor.validar(DADOS));
  assert.throws(() => executor.validar({ atividadeId: 5, demandaDestinoId: 4 }), BusinessException);
  assert.throws(() => executor.validar({ ...DADOS, demandaDestinoId: 3 }), BusinessException);
  assert.throws(() => executor.validar({ ...DADOS, campoInventado: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta(DADOS, DONO), false);
  assert.equal(await montar({ demandaDaAtividade: 4 }).executor.estaObsoleta(DADOS, DONO), true);
});
