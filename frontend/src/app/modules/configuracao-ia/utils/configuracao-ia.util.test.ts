import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { FormControl, FormGroup } from '@angular/forms';
import {
  ConfiguracaoIaResumoDto,
  EsforcoIaEnum,
  EstadoIaEnum,
  ModoContextoChatEnum,
  NIVEIS_PADRAO_DA_PROPOSTA,
  PropostaIaNivelEnum,
  TipoProvedorIaEnum,
  TipoPropostaIaEnum,
} from '@project20/shared';
import {
  OPCOES_PROVEDOR,
  cadeiaDoFormulario,
  camposDaCadeia,
  removerProvedorDoCartao,
  errosDeProvedores,
  errosPorProvedor,
  fallbacksDoFormulario,
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
  fallbacks: [],
  modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'claude-opus-5-5' } },
  esforcoAnalitico: EsforcoIaEnum.ALTO, checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
  checkinInteligente: true, rigorProporcional: false, deteccaoAutomatica: true,
  duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false, niveisProposta: {},
  usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date('2026-10-01T12:00:00Z'),
};

const grupoCom = (minimo: number | null, maximo: number | null) =>
  new FormGroup({ checkinMinimoMinutos: new FormControl(minimo), checkinMaximoMinutos: new FormControl(maximo) });

test('os três provedores podem ser escolhidos', () => {
  assert.deepEqual(OPCOES_PROVEDOR.filter((opcao) => !opcao.desabilitada).map((opcao) => opcao.valor), [
    TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.OPENAI,
  ]);
});

test('rotuloDoProvedor devolve o nome de cada provedor', () => {
  assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.ANTHROPIC), 'Anthropic');
  assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.GOOGLE), 'Google (Gemini)');
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
    'duvidasCodigo', 'esforcoAnalitico', 'fallbackPrimeiro', 'fallbackSegundo', 'iaDesligada', 'modelos', 'modoContextoChat', 'niveisProposta',
    'provedor', 'rigorProporcional',
  ]);
  assert.equal(valores.modelos.ANTHROPIC.modeloAnalitico, 'claude-opus-5-5');
  assert.deepEqual(valores.modelos.GOOGLE, { modeloRapido: '', modeloPadrao: '', modeloAnalitico: '' }, 'provedor sem modelos guardados volta vazio');
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
  const base = valoresDaVersao(VERSAO);
  const dto = paraDtoDeCriacao({
    ...base,
    modelos: { ...base.modelos, ANTHROPIC: { modeloRapido: '  claude-haiku-5-5 ', modeloPadrao: ' x', modeloAnalitico: 'y  ' } },
  });
  assert.deepEqual(dto.modelosProvedor.ANTHROPIC, { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'x', modeloAnalitico: 'y' });
  assert.equal(dto.checkinMinimoMinutos, 20);
  assert.equal(dto.duracaoRecomendadaMinutos, 90);
  assert.equal(dto.iaDesligada, false);
  assert.equal(dto.duvidasCodigo, false);
  assert.equal(dto.modoContextoChat, ModoContextoChatEnum.MISTURADO);
});

const GEMINI = { modeloRapido: 'gemini-flash', modeloPadrao: 'gemini-pro', modeloAnalitico: 'gemini-pro-max' };

test('fallbacksDoFormulario ignora "Nenhum" e sobe o segundo quando o primeiro está vazio', () => {
  assert.deepEqual(fallbacksDoFormulario({ fallbackPrimeiro: null, fallbackSegundo: TipoProvedorIaEnum.OPENAI }), [TipoProvedorIaEnum.OPENAI]);
  assert.deepEqual(fallbacksDoFormulario({ fallbackPrimeiro: null, fallbackSegundo: null }), []);
});

test('paraDtoDeCriacao leva os modelos do fallback e o trio guardado de provedor fora da cadeia; trio vazio fora da cadeia não vai', () => {
  const base = valoresDaVersao(VERSAO);
  const comGemini = paraDtoDeCriacao({ ...base, fallbackPrimeiro: TipoProvedorIaEnum.GOOGLE, modelos: { ...base.modelos, GOOGLE: GEMINI } });
  assert.deepEqual(comGemini.fallbacks, [TipoProvedorIaEnum.GOOGLE]);
  assert.deepEqual(Object.keys(comGemini.modelosProvedor), [TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.GOOGLE]);

  const guardado = paraDtoDeCriacao({ ...base, modelos: { ...base.modelos, GOOGLE: GEMINI } });
  assert.deepEqual(guardado.fallbacks, []);
  assert.deepEqual(guardado.modelosProvedor.GOOGLE, GEMINI, 'o trio do Gemini fica guardado mesmo sem estar na cadeia');
  assert.equal(paraDtoDeCriacao(base).modelosProvedor.OPENAI, undefined);
});

test('trio incoerente de provedor fora da cadeia não é enviado e não bloqueia o salvar (a tela não o mostra)', () => {
  const base = valoresDaVersao(VERSAO);
  const rascunho = { ...base, modelos: { ...base.modelos, OPENAI: { modeloRapido: 'claude-x', modeloPadrao: '', modeloAnalitico: '' } } };
  assert.deepEqual(errosDeProvedores(rascunho), []);
  assert.equal(paraDtoDeCriacao(rascunho).modelosProvedor.OPENAI, undefined);
  assert.equal(formularioIgualAVersao(rascunho, VERSAO), true, 'o rascunho escondido não conta como alteração');
});

test('trocar o padrão para o Gemini e voltar: a versão gravada devolve o trio da Anthropic preenchido', () => {
  const base = valoresDaVersao(VERSAO);
  const noGemini = paraDtoDeCriacao({ ...base, provedor: TipoProvedorIaEnum.GOOGLE, modelos: { ...base.modelos, GOOGLE: GEMINI } });
  const gravada: ConfiguracaoIaResumoDto = { ...VERSAO, versao: 4, provedor: noGemini.provedor, fallbacks: noGemini.fallbacks, modelosProvedor: noGemini.modelosProvedor };
  const deVolta = { ...valoresDaVersao(gravada), provedor: TipoProvedorIaEnum.ANTHROPIC };
  assert.equal(deVolta.modelos.ANTHROPIC.modeloPadrao, 'claude-sonnet-5-5');
  assert.deepEqual(errosDeProvedores(deVolta), []);
});

test('errosDeProvedores aponta provedor da cadeia sem modelos e modelo de outro provedor', () => {
  const base = valoresDaVersao(VERSAO);
  assert.deepEqual(errosDeProvedores(base), []);
  assert.deepEqual(errosDeProvedores({ ...base, fallbackPrimeiro: TipoProvedorIaEnum.GOOGLE }), [
    'Google está na cadeia, mas o modelo rápido não foi informado',
    'Google está na cadeia, mas o modelo padrão não foi informado',
    'Google está na cadeia, mas o modelo analítico não foi informado',
  ]);
  assert.deepEqual(
    errosDeProvedores({ ...base, modelos: { ...base.modelos, ANTHROPIC: { ...base.modelos.ANTHROPIC, modeloRapido: 'gpt-5' } } }),
    ['O modelo rápido "gpt-5" não é de Anthropic'],
  );
});

const { ANTHROPIC, GOOGLE, OPENAI } = TipoProvedorIaEnum;

test('cadeiaDoFormulario e camposDaCadeia: ida e volta, com a cadeia contígua (o que não existe vira null)', () => {
  assert.deepEqual(cadeiaDoFormulario({ provedor: ANTHROPIC, fallbackPrimeiro: null, fallbackSegundo: GOOGLE }), [ANTHROPIC, GOOGLE]);
  assert.deepEqual(camposDaCadeia([OPENAI]), { provedor: OPENAI, fallbackPrimeiro: null, fallbackSegundo: null });
  assert.deepEqual(camposDaCadeia([ANTHROPIC, GOOGLE, OPENAI]), { provedor: ANTHROPIC, fallbackPrimeiro: GOOGLE, fallbackSegundo: OPENAI });
});

test('removerProvedorDoCartao: tirar o 1º fallback sobe o 2º; o padrão nunca sai', () => {
  assert.deepEqual(removerProvedorDoCartao([ANTHROPIC, GOOGLE, OPENAI], 1), [ANTHROPIC, OPENAI]);
  assert.deepEqual(removerProvedorDoCartao([ANTHROPIC, GOOGLE, OPENAI], 2), [ANTHROPIC, GOOGLE]);
  assert.deepEqual(removerProvedorDoCartao([ANTHROPIC, GOOGLE], 0), [ANTHROPIC, GOOGLE]);
  assert.deepEqual(removerProvedorDoCartao([ANTHROPIC], 1), [ANTHROPIC]);
});

test('errosPorProvedor: só os provedores da cadeia com problema, cada um com as suas mensagens', () => {
  const base = valoresDaVersao({ ...VERSAO, fallbacks: [TipoProvedorIaEnum.GOOGLE], modelosProvedor: { ...VERSAO.modelosProvedor, [TipoProvedorIaEnum.GOOGLE]: { modeloRapido: 'gemini-2.5-flash', modeloPadrao: 'gemini-2.5-pro', modeloAnalitico: 'gemini-2.5-pro' } } });
  assert.deepEqual(errosPorProvedor(base), {});

  const quebrado = { ...base, modelos: { ...base.modelos, [TipoProvedorIaEnum.GOOGLE]: { ...base.modelos[TipoProvedorIaEnum.GOOGLE], modeloRapido: '' } } };
  assert.deepEqual(errosPorProvedor(quebrado), { [TipoProvedorIaEnum.GOOGLE]: ['Google está na cadeia, mas o modelo rápido não foi informado'] });

  const deOutro = { ...base, modelos: { ...base.modelos, [TipoProvedorIaEnum.ANTHROPIC]: { ...base.modelos[TipoProvedorIaEnum.ANTHROPIC], modeloPadrao: 'gpt-5' } } };
  assert.deepEqual(Object.keys(errosPorProvedor(deOutro)), [TipoProvedorIaEnum.ANTHROPIC]);
});

test('níveis de autonomia (task 228): a versão sem o mapa, ou com o mapa incompleto, abre no formulário com o padrão do shared', () => {
  assert.deepEqual(valoresDaVersao({ ...VERSAO, niveisProposta: null as never }).niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
  const parcial = valoresDaVersao({ ...VERSAO, niveisProposta: { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } }).niveisProposta;
  assert.equal(parcial[TipoPropostaIaEnum.ANOTAR_PAD], PropostaIaNivelEnum.PERGUNTA);
  assert.equal(parcial[TipoPropostaIaEnum.CRIAR_ATIVIDADE], PropostaIaNivelEnum.FAZ_E_AVISA);
});

test('níveis de autonomia: o DTO de criação leva o mapa completo e o formulário com o padrão explícito é igual à versão sem o mapa', () => {
  const valor = valoresDaVersao(VERSAO);
  assert.deepEqual(paraDtoDeCriacao(valor).niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
  assert.equal(formularioIgualAVersao(valor, VERSAO), true);
  assert.equal(formularioIgualAVersao({ ...valor, niveisProposta: { ...valor.niveisProposta, [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } }, VERSAO), false);
});
