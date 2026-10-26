import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PlanoAbaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PropostaObsoletaException } from '../../proposta-ia/domain/proposta-obsoleta.exception';
import { PlanoService } from '../services/plano.service';
import { AlterarTrechoDoPlanoExecutor } from './alterar-trecho-do-plano.executor';

// Executor da proposta ALTERAR_TRECHO_PLANO (task 234): aceitar, expirar com o texto alterado, desfazer sem perder edição, aba do cliente vedada ao desenvolvedor
// e quem edita o plano resolve a proposta de outra pessoa.

const DESENVOLVEDOR = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function criarCenario(textos: { tecnica?: string; cliente?: string; documentacao?: string } = {}, quemVe: 'todos' | 'ninguem' = 'todos') {
  const plano = { id: 7, titulo: 'Plano', versao: 3, descricaoTecnica: textos.tecnica ?? 'Primeira frase. Segunda frase. Terceira frase.', descricaoCliente: textos.cliente ?? 'Texto do cliente.', documentacao: textos.documentacao ?? null };
  const gravacoes: Array<Record<string, unknown>> = [];
  const servico = {
    recuperar: async (_dto: unknown, usuario: { tipo: TipoUsuarioEnum }) => {
      if (quemVe === 'ninguem') throw new ResourceNotFoundException('Plano');
      const { descricaoCliente, ...semCliente } = plano;
      return { dados: usuario.tipo === TipoUsuarioEnum.DESENVOLVEDOR ? semCliente : { ...semCliente, descricaoCliente } };
    },
    alterar: async (dto: Record<string, unknown>) => {
      gravacoes.push(dto);
      if (dto['versao'] !== plano.versao) throw new Error('versão antiga');
      if ('descricaoTecnica' in dto) plano.descricaoTecnica = dto['descricaoTecnica'] as string;
      if ('descricaoCliente' in dto) plano.descricaoCliente = dto['descricaoCliente'] as string;
      if ('documentacao' in dto) plano.documentacao = dto['documentacao'] as string;
      plano.versao += 1;
      return { dados: { id: 7, versao: plano.versao } };
    },
  };
  return { executor: new AlterarTrechoDoPlanoExecutor(servico as unknown as PlanoService), plano, gravacoes };
}

const dados = (extras: Record<string, unknown> = {}) => ({ planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Segunda frase.', trechoNovo: 'Segunda frase, reescrita.', versao: 1, planoTitulo: 'Plano', ...extras });

test('o executor é do tipo ALTERAR_TRECHO_PLANO', () => {
  assert.equal(criarCenario().executor.tipo, TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO);
});

test('validar recusa dados incompletos e trecho novo igual ao antigo', () => {
  const { executor } = criarCenario();
  executor.validar(dados());
  assert.throws(() => executor.validar({ planoId: 7 }), BusinessException);
  assert.throws(() => executor.validar(dados({ trechoNovo: 'Segunda frase.' })), BusinessException);
  assert.throws(() => executor.validar(dados({ campoDesconhecido: 1 })), BusinessException);
});

test('executar troca só o trecho, com a versão de agora (não a da proposta), e devolve o que alterou', async () => {
  const { executor, plano, gravacoes } = criarCenario();
  const resultado = await executor.executar(dados({ versao: 1 }), DESENVOLVEDOR);

  assert.equal(plano.descricaoTecnica, 'Primeira frase. Segunda frase, reescrita. Terceira frase.');
  assert.deepEqual(gravacoes, [{ id: 7, versao: 3, descricaoTecnica: 'Primeira frase. Segunda frase, reescrita. Terceira frase.' }]);
  assert.deepEqual(resultado, { planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Segunda frase.', trechoNovo: 'Segunda frase, reescrita.' });
});

test('executar com o trecho antigo fora do texto (alguém mexeu antes) expira a proposta e não grava', async () => {
  const { executor, gravacoes } = criarCenario({ tecnica: 'O texto foi reescrito por outra pessoa.' });
  await assert.rejects(() => executor.executar(dados(), DESENVOLVEDOR), PropostaObsoletaException);
  assert.deepEqual(gravacoes, []);
});

test('executar com o trecho repetido no texto também expira (não dá para saber qual)', async () => {
  const { executor, gravacoes } = criarCenario({ tecnica: 'Segunda frase. E de novo: Segunda frase.' });
  await assert.rejects(() => executor.executar(dados(), DESENVOLVEDOR), PropostaObsoletaException);
  assert.deepEqual(gravacoes, []);
});

test('o desenvolvedor não altera trecho da aba do cliente, nem confere se ele existe', async () => {
  const { executor, gravacoes } = criarCenario();
  const doCliente = dados({ aba: PlanoAbaEnum.DESCRICAO_CLIENTE, trechoAntigo: 'Texto do cliente.', trechoNovo: 'Outro.' });
  await assert.rejects(() => executor.executar(doCliente, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(gravacoes, []);
  await executor.executar(doCliente, GESTOR);
  assert.equal(gravacoes.length, 1);
});

test('desfazer devolve o trecho antigo quando o novo ainda está lá, uma vez só', async () => {
  const { executor, plano } = criarCenario({ tecnica: 'Primeira frase. Segunda frase, reescrita. Terceira frase.' });
  await executor.desfazer({ planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Segunda frase.', trechoNovo: 'Segunda frase, reescrita.' }, DESENVOLVEDOR);
  assert.equal(plano.descricaoTecnica, 'Primeira frase. Segunda frase. Terceira frase.');
});

test('desfazer recusa quando o trecho novo foi editado depois, sem perder a edição', async () => {
  const { executor, plano, gravacoes } = criarCenario({ tecnica: 'Primeira frase. Segunda editada de novo. Terceira frase.' });
  await assert.rejects(
    () => executor.desfazer({ planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Segunda frase.', trechoNovo: 'Segunda frase, reescrita.' }, DESENVOLVEDOR),
    BusinessException,
  );
  assert.equal(plano.descricaoTecnica, 'Primeira frase. Segunda editada de novo. Terceira frase.');
  assert.deepEqual(gravacoes, []);
});

test('estaObsoleta: só quando o trecho antigo não está mais uma vez só no texto, ou o plano sumiu', async () => {
  assert.equal(await criarCenario().executor.estaObsoleta(dados(), DESENVOLVEDOR), false);
  assert.equal(await criarCenario({ tecnica: 'Outra coisa.' }).executor.estaObsoleta(dados(), DESENVOLVEDOR), true);
  assert.equal(await criarCenario({ tecnica: 'Segunda frase. Segunda frase.' }).executor.estaObsoleta(dados(), DESENVOLVEDOR), true);
  assert.equal(await criarCenario({}, 'ninguem').executor.estaObsoleta(dados(), DESENVOLVEDOR), true);
});

test('podeResolver: quem acessa o plano resolve a proposta de outra pessoa; quem não o vê, não', async () => {
  assert.equal(await criarCenario().executor.podeResolver(dados(), GESTOR), true);
  assert.equal(await criarCenario({}, 'ninguem').executor.podeResolver(dados(), DESENVOLVEDOR), false);
});
