import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ExcluirAtividadeExecutor } from '../executores/excluir-atividade.executor';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';
import { ProporExcluirAtividadeFerramenta } from './propor-excluir-atividade.ferramenta';

// Excluir atividade (task 230): só sem execução. A ferramenta recusa com o motivo quando há execução; o executor exclui e restaura pela service com o
// token (que confere dono ou gestor); o desfazer só vale sem execução nova.

const DONO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const OUTRO = { sub: 8, login: 'outro', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

/** `HttpException.message` não traz o texto da resposta; o texto do usuário está em `getResponse().mensagem`. */
const contem = (trecho: string) => (erro: unknown) => String(((erro as BusinessException).getResponse() as { mensagem: string }).mensagem).includes(trecho);

function montar(opcoes: { comExecucao?: boolean } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const exclusoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  const restauracoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  let comExecucao = opcoes.comExecucao ?? false;
  const atividade = { id: 5, nome: 'Montar formulário', demandaId: 3, usuarioId: 7 };
  const atividadeService = {
    recuperar: async () => ({ dados: atividade }),
    excluir: async (dto: Record<string, unknown>, usuario: { sub: number; tipo: TipoUsuarioEnum }) => {
      if (usuario.tipo !== TipoUsuarioEnum.GESTOR && usuario.sub !== atividade.usuarioId) throw new UnauthorizedAccessException('Só o dono ou o gestor');
      exclusoes.push({ dto, usuario });
      return { dados: null };
    },
    restaurar: async (dto: Record<string, unknown>, usuario: unknown) => {
      restauracoes.push({ dto, usuario });
      return { dados: { id: 5 } };
    },
  } as unknown as AtividadeService;
  const atividadeRepositorio = { possuiExecucao: async () => comExecucao } as unknown as AtividadeRepository;
  const demandaRepositorio = { recuperar: async () => ({ id: 3, nome: 'Autenticação' }) } as unknown as DemandaRepository;
  const propostaIa = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 81, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  return {
    ferramenta: new ProporExcluirAtividadeFerramenta(propostaIa, atividadeService, atividadeRepositorio, demandaRepositorio),
    executor: new ExcluirAtividadeExecutor(atividadeService, atividadeRepositorio),
    propostas, exclusoes, restauracoes,
    ganharExecucao: () => { comExecucao = true; },
  };
}

test('propor: guarda o nome da atividade e da demanda, sem excluir nada; é ferramenta de qualquer usuário', async () => {
  const { ferramenta, propostas, exclusoes } = montar();
  assert.equal(ferramenta.permissao, 'QUALQUER');
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.EXCLUIR_ATIVIDADE);
  await ferramenta.executar({ atividadeId: 5 }, DONO);
  assert.deepEqual(propostas[0].dados, { atividadeId: 5, atividadeNome: 'Montar formulário', demandaNome: 'Autenticação' });
  assert.deepEqual(exclusoes, []);
});

test('propor: o gestor propõe excluir a atividade de outra pessoa; quem não é o dono nem gestor é recusado', async () => {
  const gestor = montar();
  await gestor.ferramenta.executar({ atividadeId: 5 }, GESTOR);
  assert.equal(gestor.propostas.length, 1);

  const outro = montar();
  await assert.rejects(() => outro.ferramenta.executar({ atividadeId: 5 }, OUTRO), BusinessException);
  assert.equal(outro.propostas.length, 0);
});

test('propor: atividade com execução é recusada com o motivo (pela tela) e nenhuma proposta nasce', async () => {
  const { ferramenta, propostas } = montar({ comExecucao: true });
  await assert.rejects(() => ferramenta.executar({ atividadeId: 5 }, DONO), contem('tela de Atividades'));
  await assert.rejects(() => ferramenta.executar({ atividadeId: 5 }, GESTOR), contem('tem execuções'));
  assert.equal(propostas.length, 0);
});

test('executar: exclui pela service com o usuário do token; o dono exclui, quem não é dono nem gestor não', async () => {
  const { executor, exclusoes } = montar();
  const resultado = await executor.executar({ atividadeId: 5 }, DONO);
  assert.deepEqual(exclusoes, [{ dto: { id: 5 }, usuario: DONO }]);
  assert.deepEqual(resultado, { atividadeId: 5 });

  const outro = montar();
  await assert.rejects(() => outro.executor.executar({ atividadeId: 5 }, OUTRO), UnauthorizedAccessException);
  assert.deepEqual(outro.exclusoes, []);
});

test('executar: a atividade que ganhou execução depois da proposta é recusada e nada é excluído', async () => {
  const { executor, exclusoes } = montar({ comExecucao: true });
  await assert.rejects(() => executor.executar({ atividadeId: 5 }, DONO), BusinessException);
  assert.deepEqual(exclusoes, []);
});

test('desfazer: restaura pela service com o usuário do token; recusa se a atividade tem execução nova', async () => {
  const feito = montar();
  await feito.executor.desfazer({ atividadeId: 5 }, DONO);
  assert.deepEqual(feito.restauracoes, [{ dto: { id: 5 }, usuario: DONO }]);

  const comNova = montar();
  comNova.ganharExecucao();
  await assert.rejects(() => comNova.executor.desfazer({ atividadeId: 5 }, DONO), BusinessException);
  assert.deepEqual(comNova.restauracoes, []);
  await assert.rejects(() => feito.executor.desfazer({}, DONO), BusinessException);
});

test('validar: dados inválidos e campos desconhecidos são recusados', () => {
  const { executor } = montar();
  assert.doesNotThrow(() => executor.validar({ atividadeId: 5, atividadeNome: 'X', demandaNome: 'Y' }));
  assert.throws(() => executor.validar({ atividadeId: 0 }), BusinessException);
  assert.throws(() => executor.validar({ atividadeId: 5, campoInventado: 1 }), BusinessException);
});
