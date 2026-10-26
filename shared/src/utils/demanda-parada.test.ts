import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum } from '../enums/tipo-demanda-status.enum';
import { demandaEstaParada, PRAZO_DEMANDA_PARADA_DIAS } from './demanda-parada';

const AGORA = new Date('2026-10-25T12:00:00Z');
const haDias = (dias: number, extraMs = 0) => new Date(AGORA.getTime() - dias * 86_400_000 - extraMs);
const base = { status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 8, ultimaExecucaoData: haDias(10), criadaData: haDias(30) };

test('o prazo é de 7 dias', () => {
  assert.equal(PRAZO_DEMANDA_PARADA_DIAS, 7);
});

test('sem execução há mais de 7 dias está parada; nos 7 dias exatos ainda não', () => {
  assert.equal(demandaEstaParada(base, AGORA), true);
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: haDias(7) }, AGORA), false);
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: haDias(7, 1000) }, AGORA), true);
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: haDias(2) }, AGORA), false);
});

test('nunca executada: vale a criação, também com mais de 7 dias', () => {
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: null, criadaData: haDias(8) }, AGORA), true);
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: null, criadaData: haDias(3) }, AGORA), false);
});

test('concluída, cancelada e sem estimativa ficam fora; pendente entra', () => {
  assert.equal(demandaEstaParada({ ...base, status: TipoDemandaStatusEnum.CONCLUIDA }, AGORA), false);
  assert.equal(demandaEstaParada({ ...base, status: TipoDemandaStatusEnum.CANCELADA }, AGORA), false);
  assert.equal(demandaEstaParada({ ...base, horasEstimadas: 0 }, AGORA), false);
  assert.equal(demandaEstaParada({ ...base, status: TipoDemandaStatusEnum.PENDENTE }, AGORA), true);
});

test('aceita datas em texto ISO e ignora data inválida', () => {
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: haDias(10).toISOString() }, AGORA), true);
  assert.equal(demandaEstaParada({ ...base, ultimaExecucaoData: 'xx' }, AGORA), false);
});
