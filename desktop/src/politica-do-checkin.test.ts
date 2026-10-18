import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SituacaoDoCheckin, checkinExigido, deveAbrirJanelinha, deveFecharJanelinha, enderecoDaApi, lerEstadoDaIa, lerSituacao, segundosAteOCheckin } from './politica-do-checkin';

function situacao(parcial: Partial<SituacaoDoCheckin> = {}): SituacaoDoCheckin {
  return { haCheckin: true, disparado: true, suspenso: false, proximoCheckinData: null, ...parcial };
}

test('lê a situação da API e recusa o que não tem o formato', () => {
  const corpo = { dados: { haCheckin: true, disparado: true, suspensao: { suspenso: false }, proximoCheckinData: '2026-10-19T12:30:00Z' } };
  assert.deepEqual(lerSituacao(corpo), { haCheckin: true, disparado: true, suspenso: false, proximoCheckinData: '2026-10-19T12:30:00Z' });
  assert.equal(lerSituacao({ dados: { haCheckin: 'sim' } }), null);
  assert.equal(lerSituacao(null), null);
  assert.equal(lerSituacao({ dados: { haCheckin: false, disparado: false, suspensao: { suspenso: true } } })?.suspenso, true);
});

test('lê o estado da IA', () => {
  assert.equal(lerEstadoDaIa({ dados: { estado: 'NO_AR' } }), 'NO_AR');
  assert.equal(lerEstadoDaIa({ dados: {} }), null);
  assert.equal(lerEstadoDaIa(undefined), null);
});

test('o check-in só é exigido com execução, horário chegado e sem suspensão', () => {
  assert.equal(checkinExigido(situacao()), true);
  assert.equal(checkinExigido(situacao({ disparado: false })), false);
  assert.equal(checkinExigido(situacao({ haCheckin: false })), false);
  assert.equal(checkinExigido(situacao({ suspenso: true })), false);
  assert.equal(checkinExigido(null), false);
});

test('a janelinha abre só com o Project minimizado, check-in exigido, IA no ar e nenhuma aberta', () => {
  const base = { principalMinimizada: true, situacao: situacao(), estadoDaIa: 'NO_AR', janelinhaAberta: false };
  assert.equal(deveAbrirJanelinha(base), true);
  assert.equal(deveAbrirJanelinha({ ...base, principalMinimizada: false }), false);
  assert.equal(deveAbrirJanelinha({ ...base, janelinhaAberta: true }), false);
  assert.equal(deveAbrirJanelinha({ ...base, estadoDaIa: 'FORA_DO_AR' }), false);
  assert.equal(deveAbrirJanelinha({ ...base, estadoDaIa: null }), false);
  assert.equal(deveAbrirJanelinha({ ...base, situacao: situacao({ disparado: false }) }), false);
});

test('a janelinha some ao registrar, suspender, acabar a execução ou quando o Project volta à tela', () => {
  assert.equal(deveFecharJanelinha(true, situacao()), false);
  assert.equal(deveFecharJanelinha(true, situacao({ disparado: false })), true);
  assert.equal(deveFecharJanelinha(true, situacao({ suspenso: true })), true);
  assert.equal(deveFecharJanelinha(true, situacao({ haCheckin: false })), true);
  assert.equal(deveFecharJanelinha(false, situacao()), true);
});

test('sem leitura da situação a janelinha fica como está', () => {
  assert.equal(deveFecharJanelinha(true, null), false);
});

test('os segundos até o check-in vêm do horário do backend', () => {
  const agora = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(segundosAteOCheckin(situacao({ proximoCheckinData: '2026-10-19T12:30:00Z' }), agora), 1800);
  assert.equal(segundosAteOCheckin(situacao({ proximoCheckinData: '2026-10-19T11:00:00Z' }), agora), 0);
  assert.equal(segundosAteOCheckin(situacao(), agora), null);
  assert.equal(segundosAteOCheckin(null, agora), null);
  assert.equal(segundosAteOCheckin(situacao({ proximoCheckinData: 'lixo' }), agora), null);
});

test('o endereço da API fica na origem do front', () => {
  assert.equal(enderecoDaApi('http://servidor:8080/', 'checkin/situacao'), 'http://servidor:8080/api/v1/checkin/situacao');
  assert.equal(enderecoDaApi('http://localhost:4200/', '/ia/disponibilidade'), 'http://localhost:4200/api/v1/ia/disponibilidade');
});
