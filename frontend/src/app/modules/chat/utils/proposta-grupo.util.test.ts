import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { PropostaIaResumoDto, StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { posicoesDeQueDepende, PropostasDoGrupo, resumirGrupo } from './proposta-grupo.util';

const AGORA = new Date('2026-10-25T15:00:00Z');
const proposta = (id: number, status: StatusPropostaIaEnum, extras: Partial<PropostaIaResumoDto> = {}): PropostaIaResumoDto => ({
  id, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status, dados: {}, resultado: null, resolucaoData: null, createdDate: new Date('2026-10-25T12:00:00Z'), ...extras,
});
const doGrupo = (...propostas: PropostaIaResumoDto[]): PropostasDoGrupo => Object.fromEntries(propostas.map((item) => [item.id, item]));
const resolvidaHa = (minutos: number) => new Date(AGORA.getTime() - minutos * 60_000);
const SEM_FORA = new Set<number>();

test('tudo pendente: todas entram nas ações do grupo e o texto diz quantas esperam', () => {
  const resumo = resumirGrupo([1, 2, 3], doGrupo(proposta(1, StatusPropostaIaEnum.PENDENTE), proposta(2, StatusPropostaIaEnum.PENDENTE), proposta(3, StatusPropostaIaEnum.PENDENTE)), SEM_FORA, AGORA);
  assert.deepEqual(resumo.pendentes, [1, 2, 3]);
  assert.equal(resumo.resolvido, false);
  assert.equal(resumo.texto, '3 esperando você');
});

test('o que o usuário tirou do grupo continua pendente, mas fora das ações em grupo', () => {
  const propostas = doGrupo(proposta(1, StatusPropostaIaEnum.PENDENTE), proposta(2, StatusPropostaIaEnum.PENDENTE));
  const resumo = resumirGrupo([1, 2], propostas, new Set([2]), AGORA);
  assert.deepEqual(resumo.pendentes, [1]);
  assert.deepEqual(resumo.foraDoGrupo, [2]);
  assert.equal(resumo.texto, '1 esperando você · 1 fora do grupo');
});

test('parcial: as feitas e as que esperam aparecem juntas, e ainda não está resolvido', () => {
  const propostas = doGrupo(proposta(1, StatusPropostaIaEnum.CONFIRMADA, { resolucaoData: resolvidaHa(1) }), proposta(2, StatusPropostaIaEnum.PENDENTE));
  const resumo = resumirGrupo([1, 2], propostas, SEM_FORA, AGORA);
  assert.equal(resumo.texto, '1 feita · 1 esperando você');
  assert.equal(resumo.resolvido, false);
});

test('tudo feito: resolvido, com "N feitas", e só as dentro do prazo podem ser desfeitas', () => {
  const propostas = doGrupo(
    proposta(1, StatusPropostaIaEnum.CONFIRMADA, { resolucaoData: resolvidaHa(5) }),
    proposta(2, StatusPropostaIaEnum.AJUSTADA, { resolucaoData: resolvidaHa(5) }),
    proposta(3, StatusPropostaIaEnum.CONFIRMADA, { resolucaoData: resolvidaHa(45) }),
  );
  const resumo = resumirGrupo([1, 2, 3], propostas, SEM_FORA, AGORA);
  assert.equal(resumo.resolvido, true);
  assert.equal(resumo.texto, '3 feitas');
  assert.deepEqual(resumo.desfaziveis, [1, 2]);
});

test('recusadas e desfeitas entram na contagem; tudo recusado não é "resolvido" (não há o que desfazer)', () => {
  const propostas = doGrupo(proposta(1, StatusPropostaIaEnum.EXPIRADA), proposta(2, StatusPropostaIaEnum.DESFEITA));
  const resumo = resumirGrupo([1, 2], propostas, SEM_FORA, AGORA);
  assert.equal(resumo.texto, '1 recusada · 1 desfeita');
  assert.equal(resumo.resolvido, false);
});

test('com proposta ainda por chegar o resumo fica carregando e não declara o grupo resolvido', () => {
  const resumo = resumirGrupo([1, 2], doGrupo(proposta(1, StatusPropostaIaEnum.CONFIRMADA, { resolucaoData: resolvidaHa(1) })), SEM_FORA, AGORA);
  assert.equal(resumo.carregando, true);
  assert.equal(resumo.resolvido, false);
});

test('"depende da N": a posição no grupo da proposta de que esta precisa', () => {
  const demanda = proposta(10, StatusPropostaIaEnum.PENDENTE, { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA });
  const filha = proposta(11, StatusPropostaIaEnum.PENDENTE, { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: { demandaPaiPropostaId: 10 } });
  const propostas = doGrupo(demanda, filha, proposta(12, StatusPropostaIaEnum.PENDENTE));
  assert.deepEqual(posicoesDeQueDepende(11, [10, 11, 12], propostas), [1]);
  assert.deepEqual(posicoesDeQueDepende(10, [10, 11, 12], propostas), []);
  assert.deepEqual(posicoesDeQueDepende(12, [10, 11, 12], propostas), []);
});

test('dependência de uma proposta que não está no grupo (ou ainda não carregou) não mostra posição', () => {
  const filha = proposta(11, StatusPropostaIaEnum.PENDENTE, { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: { demandaPaiPropostaId: 10 } });
  assert.deepEqual(posicoesDeQueDepende(11, [11, 12], doGrupo(filha)), []);
  assert.deepEqual(posicoesDeQueDepende(11, [10, 11], {}), []);
});
