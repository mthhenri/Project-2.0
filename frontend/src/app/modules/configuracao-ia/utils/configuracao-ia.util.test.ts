import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { FormControl, FormGroup } from '@angular/forms';
import { ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum } from '@project20/shared';
import {
  OPCOES_PROVEDOR,
  ROTULO_ESTADO_IA,
  SEVERIDADE_ESTADO_IA,
  formularioIgualAVersao,
  intervaloDoCheckinValido,
  paraDtoDeCriacao,
  rotuloDoEsforco,
  rotuloDoProvedor,
  valoresDaVersao,
} from './configuracao-ia.util';

const VERSAO: ConfiguracaoIaResumoDto = {
  id: 4, versao: 3, provedor: TipoProvedorIaEnum.ANTHROPIC,
  modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'claude-opus-5-5',
  esforcoAnalitico: EsforcoIaEnum.ALTO, checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
  checkinInteligente: true, rigorProporcional: false, deteccaoAutomatica: true,
  duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false,
  usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date('2026-10-01T12:00:00Z'),
};

const grupoCom = (minimo: number | null, maximo: number | null) =>
  new FormGroup({ checkinMinimoMinutos: new FormControl(minimo), checkinMaximoMinutos: new FormControl(maximo) });

test('só a Anthropic pode ser escolhida como provedor; Google e OpenAI aparecem desabilitados', () => {
  const habilitados = OPCOES_PROVEDOR.filter((opcao) => !opcao.desabilitada).map((opcao) => opcao.valor);
  assert.deepEqual(habilitados, [TipoProvedorIaEnum.ANTHROPIC]);
  assert.equal(OPCOES_PROVEDOR.length, 3);
});

test('rotuloDoProvedor tira o aviso "ainda sem suporte" do rótulo', () => {
  assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.ANTHROPIC), 'Anthropic');
  assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.GOOGLE), 'Google');
  assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.OPENAI), 'OpenAI');
});

test('rotuloDoEsforco devolve o rótulo em português; valor desconhecido volta como veio', () => {
  assert.equal(rotuloDoEsforco(EsforcoIaEnum.BAIXO), 'Baixo');
  assert.equal(rotuloDoEsforco(EsforcoIaEnum.MEDIO), 'Médio');
  assert.equal(rotuloDoEsforco(EsforcoIaEnum.ALTO), 'Alto');
  assert.equal(rotuloDoEsforco('EXTREMO' as EsforcoIaEnum), 'EXTREMO');
});

test('todo estado da IA tem rótulo e severidade (no ar verde, fora do ar vermelho, desligada neutra)', () => {
  for (const estado of Object.values(EstadoIaEnum)) {
    assert.ok(ROTULO_ESTADO_IA[estado], estado);
    assert.ok(SEVERIDADE_ESTADO_IA[estado], estado);
  }
  assert.equal(ROTULO_ESTADO_IA[EstadoIaEnum.NO_AR], 'No ar');
  assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.NO_AR], 'success');
  assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.FORA_DO_AR], 'danger');
  assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.DESLIGADA], 'secondary');
});

test('intervaloDoCheckinValido: mínimo menor que o máximo passa; igual ou maior falha', () => {
  assert.equal(intervaloDoCheckinValido(grupoCom(20, 40)), null);
  assert.deepEqual(intervaloDoCheckinValido(grupoCom(40, 40)), { intervaloInvalido: true });
  assert.deepEqual(intervaloDoCheckinValido(grupoCom(50, 40)), { intervaloInvalido: true });
});

test('intervaloDoCheckinValido: campo ainda vazio não acusa intervalo (o "obrigatório" é de cada campo)', () => {
  assert.equal(intervaloDoCheckinValido(grupoCom(null, 40)), null);
  assert.equal(intervaloDoCheckinValido(grupoCom(20, null)), null);
  assert.equal(intervaloDoCheckinValido(new FormGroup({})), null);
});

test('valoresDaVersao copia só os campos do formulário (sem id, versão, autor nem data)', () => {
  const valores = valoresDaVersao(VERSAO);
  assert.deepEqual(Object.keys(valores).sort(), [
    'checkinInteligente', 'checkinMaximoMinutos', 'checkinMinimoMinutos', 'deteccaoAutomatica', 'duracaoRecomendadaMinutos',
    'duvidasCodigo', 'esforcoAnalitico', 'iaDesligada', 'modeloAnalitico', 'modeloPadrao', 'modeloRapido', 'modoContextoChat', 'provedor',
    'rigorProporcional',
  ]);
  assert.equal(valores.modeloAnalitico, 'claude-opus-5-5');
  assert.equal(valores.rigorProporcional, false);
});

test('formularioIgualAVersao: igual à versão não há o que salvar; qualquer campo diferente habilita salvar', () => {
  assert.equal(formularioIgualAVersao(valoresDaVersao(VERSAO), VERSAO), true);
  assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), iaDesligada: true }, VERSAO), false);
  assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), checkinMaximoMinutos: 41 }, VERSAO), false);
  assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), esforcoAnalitico: EsforcoIaEnum.BAIXO }, VERSAO), false);
  assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), duvidasCodigo: true }, VERSAO), false);
  assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), modoContextoChat: ModoContextoChatEnum.SEPARADO }, VERSAO), false);
});

test('paraDtoDeCriacao apara os nomes dos modelos e mantém o restante', () => {
  const dto = paraDtoDeCriacao({ ...valoresDaVersao(VERSAO), modeloRapido: '  claude-haiku-5-5 ', modeloPadrao: ' x', modeloAnalitico: 'y  ' });
  assert.equal(dto.modeloRapido, 'claude-haiku-5-5');
  assert.equal(dto.modeloPadrao, 'x');
  assert.equal(dto.modeloAnalitico, 'y');
  assert.equal(dto.checkinMinimoMinutos, 20);
  assert.equal(dto.duracaoRecomendadaMinutos, 90);
  assert.equal(dto.iaDesligada, false);
  assert.equal(dto.duvidasCodigo, false);
  assert.equal(dto.modoContextoChat, ModoContextoChatEnum.MISTURADO);
});
