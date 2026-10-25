import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ConcluirDemandaExecutor } from '../executores/concluir-demanda.executor';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';
import { ProporConcluirDemandaFerramenta } from './propor-concluir-demanda.ferramenta';

// Concluir demanda (task 229): a ferramenta só cria a proposta (com o aviso das atividades abertas); o executor conclui pela service com o token e
// o desfazer só volta o status se a demanda ainda está concluída. As atividades abertas nunca mudam.

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** `HttpException.message` não traz o texto da resposta; o texto do usuário está em `getResponse().mensagem`. */
const contem = (trecho: string) => (erro: unknown) => String(((erro as BusinessException).getResponse() as { mensagem: string }).mensagem).includes(trecho);

function montar(opcoes: { status?: TipoDemandaStatusEnum; abertas?: number; semAcesso?: boolean } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const alteracoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  const demanda = { id: 3, nome: 'Relatórios', projetoId: 2, status: opcoes.status ?? TipoDemandaStatusEnum.PLANEJADA };
  const demandaService = {
    recuperar: async () => {
      if (opcoes.semAcesso) throw new BusinessException('Sem acesso');
      return { dados: { ...demanda } };
    },
    alterar: async (dto: Record<string, unknown>, usuario: unknown) => {
      alteracoes.push({ dto, usuario });
      demanda.status = dto['status'] as TipoDemandaStatusEnum;
      return { dados: {} };
    },
  } as unknown as DemandaService;
  const propostaIa = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 71, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  const demandaRepositorio = { contarAtividadesEmAberto: async () => opcoes.abertas ?? 0 } as unknown as DemandaRepository;
  const projetoService = { recuperar: async () => ({ dados: { nome: 'Portal' } }) } as unknown as ProjetoService;
  return {
    ferramenta: new ProporConcluirDemandaFerramenta(propostaIa, demandaService, demandaRepositorio, projetoService),
    executor: new ConcluirDemandaExecutor(demandaService),
    propostas, alteracoes, demanda,
  };
}

test('propor: guarda os nomes, o status de antes e as atividades abertas, sem concluir nada', async () => {
  const { ferramenta, propostas, alteracoes } = montar({ abertas: 3 });
  assert.equal(ferramenta.permissao, 'QUALQUER');
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.CONCLUIR_DEMANDA);
  await ferramenta.executar({ demandaId: 3 }, USUARIO);
  assert.deepEqual(propostas[0].dados, { demandaId: 3, demandaNome: 'Relatórios', projetoNome: 'Portal', statusAnterior: 'PLANEJADA', atividadesEmAberto: 3 });
  assert.deepEqual(alteracoes, []);
});

test('propor: demanda já concluída ou sem acesso do usuário é recusada sem proposta', async () => {
  const concluida = montar({ status: TipoDemandaStatusEnum.CONCLUIDA });
  await assert.rejects(() => concluida.ferramenta.executar({ demandaId: 3 }, USUARIO), contem('já está concluída'));
  const semAcesso = montar({ semAcesso: true });
  await assert.rejects(() => semAcesso.ferramenta.executar({ demandaId: 3 }, USUARIO), BusinessException);
  assert.equal(concluida.propostas.length + semAcesso.propostas.length, 0);
});

test('executar: conclui só a demanda, pela service e com o usuário do token, e guarda o status de antes', async () => {
  const { executor, alteracoes } = montar({ abertas: 2 });
  const resultado = await executor.executar({ demandaId: 3, atividadesEmAberto: 2 }, USUARIO);
  assert.deepEqual(alteracoes, [{ dto: { id: 3, status: 'CONCLUIDA' }, usuario: USUARIO }]);
  assert.deepEqual(resultado, { demandaId: 3, statusAnterior: 'PLANEJADA' });
});

test('executar: demanda que já foi concluída no meio do caminho é recusada e nada é gravado', async () => {
  const { executor, alteracoes } = montar({ status: TipoDemandaStatusEnum.CONCLUIDA });
  await assert.rejects(() => executor.executar({ demandaId: 3 }, USUARIO), BusinessException);
  assert.deepEqual(alteracoes, []);
});

test('desfazer: volta o status de antes; recusa se a demanda já não está concluída (mudou depois)', async () => {
  const feita = montar({ status: TipoDemandaStatusEnum.CONCLUIDA });
  await feita.executor.desfazer({ demandaId: 3, statusAnterior: 'PLANEJADA' }, USUARIO);
  assert.deepEqual(feita.alteracoes, [{ dto: { id: 3, status: 'PLANEJADA' }, usuario: USUARIO }]);

  const mudou = montar({ status: TipoDemandaStatusEnum.CANCELADA });
  await assert.rejects(() => mudou.executor.desfazer({ demandaId: 3, statusAnterior: 'PLANEJADA' }, USUARIO), BusinessException);
  assert.deepEqual(mudou.alteracoes, []);
  await assert.rejects(() => mudou.executor.desfazer({}, USUARIO), BusinessException);
});

test('validar: dados inválidos são recusados; obsoleta quando a demanda já está concluída', async () => {
  const { executor } = montar();
  assert.doesNotThrow(() => executor.validar({ demandaId: 3, demandaNome: 'X' }));
  assert.throws(() => executor.validar({ demandaId: 0 }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 3, campoInventado: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaId: 3 }, USUARIO), false);
  assert.equal(await montar({ status: TipoDemandaStatusEnum.CONCLUIDA }).executor.estaObsoleta({ demandaId: 3 }, USUARIO), true);
});
