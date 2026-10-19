import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { estadoDaFaixaDeExecucao, formatarIntervaloDaExecucao } from './faixa-execucao.util';

const base = {
  podeAgir: true,
  status: TipoAtividadeStatusEnum.DESENVOLVENDO,
  execucaoAbertaNestaAtividade: false,
  donoExecutandoOutra: false,
};

describe('estadoDaFaixaDeExecucao', () => {
  it('oculta quando quem olha não pode agir, mesmo com execução aberta', () => {
    assert.equal(estadoDaFaixaDeExecucao({ ...base, podeAgir: false, execucaoAbertaNestaAtividade: true }), 'oculta');
  });

  it('ativa quando há execução em andamento, qualquer que seja o status', () => {
    assert.equal(estadoDaFaixaDeExecucao({ ...base, status: TipoAtividadeStatusEnum.DESENVOLVIDA, execucaoAbertaNestaAtividade: true }), 'ativa');
  });

  it('bloqueada em Pendente e Desenvolvida', () => {
    assert.equal(estadoDaFaixaDeExecucao({ ...base, status: TipoAtividadeStatusEnum.PENDENTE }), 'bloqueada');
    assert.equal(estadoDaFaixaDeExecucao({ ...base, status: TipoAtividadeStatusEnum.DESENVOLVIDA }), 'bloqueada');
  });

  it('outra quando o dono já executa outra atividade; o bloqueio de status vem antes', () => {
    assert.equal(estadoDaFaixaDeExecucao({ ...base, donoExecutandoOutra: true }), 'outra');
    assert.equal(estadoDaFaixaDeExecucao({ ...base, status: TipoAtividadeStatusEnum.PENDENTE, donoExecutandoOutra: true }), 'bloqueada');
  });

  it('livre em Planejada e Desenvolvendo sem execução à vista', () => {
    assert.equal(estadoDaFaixaDeExecucao(base), 'livre');
    assert.equal(estadoDaFaixaDeExecucao({ ...base, status: TipoAtividadeStatusEnum.PLANEJADA }), 'livre');
  });
});

describe('formatarIntervaloDaExecucao', () => {
  // Instantes ISO: Brasília é UTC-3, então 12:00Z é 09:00 no fuso do sistema, qualquer que seja o fuso do navegador.
  const fuso = 'America/Sao_Paulo';
  const agora = new Date('2026-10-18T18:00:00Z'); // 15:00 de 18/10 em Brasília

  it('hoje, com início e fim', () => {
    assert.equal(formatarIntervaloDaExecucao('2026-10-18T12:12:00Z', '2026-10-18T14:27:00Z', agora, fuso), 'hoje 09:12 → 11:27');
  });

  it('ontem', () => {
    assert.equal(formatarIntervaloDaExecucao('2026-10-17T20:00:00Z', '2026-10-17T21:10:00Z', agora, fuso), 'ontem 17:00 → 18:10');
  });

  it('em andamento termina em "agora"', () => {
    assert.equal(formatarIntervaloDaExecucao('2026-10-18T17:00:00Z', null, agora, fuso), 'hoje 14:00 → agora');
  });

  it('atravessa a meia-noite mostrando o dia do fim; dias antigos viram dd/mm', () => {
    assert.equal(formatarIntervaloDaExecucao('2026-10-11T01:00:00Z', '2026-10-11T04:30:00Z', agora, fuso), '10/10 22:00 → 11/10 01:30');
  });

  it('o dia é o do fuso do sistema: 02:00Z de 19/10 ainda é 18/10 (23:00) em Brasília', () => {
    assert.equal(formatarIntervaloDaExecucao('2026-10-19T02:00:00Z', null, agora, fuso), 'hoje 23:00 → agora');
  });
});
