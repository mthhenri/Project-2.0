import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { CheckinSituacaoConsultadaDto, EstadoIaEnum } from '@project20/shared';
import { decidirEstado, deveMostrarJanelinha, esperaAteOCheckin } from './checkin.util';

function situacao(parcial: Partial<CheckinSituacaoConsultadaDto> & { execucaoId?: number | null; suspenso?: boolean; disparado?: boolean } = {}): CheckinSituacaoConsultadaDto {
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
    proximoCheckinData: parcial.proximoCheckinData ?? null,
    disparado: parcial.disparado ?? false,
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

test('a janelinha aparece só com o horário disparado, execução e sem suspensão', () => {
  assert.equal(deveMostrarJanelinha(situacao({ disparado: true }), null), true);
  assert.equal(deveMostrarJanelinha(situacao({ disparado: false }), null), false);
  assert.equal(deveMostrarJanelinha(situacao({ disparado: true, suspenso: true }), null), false);
  assert.equal(deveMostrarJanelinha(situacao({ disparado: true, execucaoId: null }), null), false);
  assert.equal(deveMostrarJanelinha(null, null), false);
});

test('com a IA desligada ou fora do ar a janelinha não trava a tela', () => {
  const disparada = situacao({ disparado: true });
  assert.equal(deveMostrarJanelinha(disparada, EstadoIaEnum.NO_AR), true);
  assert.equal(deveMostrarJanelinha(disparada, EstadoIaEnum.DESLIGADA), false);
  assert.equal(deveMostrarJanelinha(disparada, EstadoIaEnum.FORA_DO_AR), false);
});

test('a espera até o check-in vem do horário sorteado e some quando já disparou', () => {
  const agora = new Date('2026-10-19T12:00:00Z').getTime();
  const proximo = new Date('2026-10-19T12:30:00Z');
  assert.equal(esperaAteOCheckin(situacao({ proximoCheckinData: proximo }), agora), 30 * 60_000);
  assert.equal(esperaAteOCheckin(situacao({ proximoCheckinData: proximo, disparado: true }), agora), null);
  assert.equal(esperaAteOCheckin(situacao(), agora), null);
  assert.equal(esperaAteOCheckin(situacao({ proximoCheckinData: new Date('2026-10-19T11:00:00Z') }), agora), 0);
});
