import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
  const agora = new Date(2026, 9, 18, 15, 0);

  it('hoje, com início e fim', () => {
    assert.equal(formatarIntervaloDaExecucao(new Date(2026, 9, 18, 9, 12), new Date(2026, 9, 18, 11, 27), agora), 'hoje 09:12 → 11:27');
  });

  it('ontem', () => {
    assert.equal(formatarIntervaloDaExecucao(new Date(2026, 9, 17, 17, 0), new Date(2026, 9, 17, 18, 10), agora), 'ontem 17:00 → 18:10');
  });

  it('em andamento termina em "agora"', () => {
    assert.equal(formatarIntervaloDaExecucao(new Date(2026, 9, 18, 14, 0), null, agora), 'hoje 14:00 → agora');
  });

  it('atravessa a meia-noite mostrando o dia do fim; dias antigos viram dd/mm', () => {
    assert.equal(formatarIntervaloDaExecucao(new Date(2026, 9, 10, 22, 0), new Date(2026, 9, 11, 1, 30), agora), '10/10 22:00 → 11/10 01:30');
  });
});
