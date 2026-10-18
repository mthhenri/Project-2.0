import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CheckinSituacaoConsultadaDto } from '@project20/shared';
import { decidirEstado } from './checkin.util';

function situacao(parcial: Partial<CheckinSituacaoConsultadaDto> & { execucaoId?: number | null; suspenso?: boolean } = {}): CheckinSituacaoConsultadaDto {
  const execucaoId = parcial.execucaoId === undefined ? 5 : parcial.execucaoId;
  return {
    haCheckin: execucaoId !== null,
    execucao: execucaoId === null ? null : { id: execucaoId, atividade: 'A', demanda: 'D', projeto: 'P', descricao: 'x', inicio: new Date(), minutos: 30 },
    suspensao: { suspenso: parcial.suspenso ?? false, desde: null, motivo: null },
    checkinMinimoMinutos: 30,
    checkinMaximoMinutos: 80,
    duracaoRecomendadaMinutos: 90,
    rigorProporcional: true,
    acimaDoRecomendado: false,
  };
}

test('sem execução ao abrir, não há check-in', () => {
  assert.equal(decidirEstado(situacao({ execucaoId: null }), null), 'SEM_EXECUCAO');
});

test('com a mesma execução em andamento, o check-in segue', () => {
  assert.equal(decidirEstado(situacao(), 5), 'EM_ANDAMENTO');
  assert.equal(decidirEstado(situacao(), null), 'EM_ANDAMENTO');
});

test('execução trocada desde a abertura (descrição confirmada) é registrado', () => {
  assert.equal(decidirEstado(situacao({ execucaoId: 6 }), 5), 'REGISTRADO');
});

test('execução que acabou desde a abertura (pausada) também libera a janela', () => {
  assert.equal(decidirEstado(situacao({ execucaoId: null }), 5), 'REGISTRADO');
});

test('check-ins suspensos (reunião) liberam a janela, mesmo com a execução em andamento', () => {
  assert.equal(decidirEstado(situacao({ suspenso: true }), 5), 'SUSPENSO');
});
