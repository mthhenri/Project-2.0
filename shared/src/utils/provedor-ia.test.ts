import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TipoProvedorIaEnum } from '../enums/tipo-provedor-ia.enum';
import { cadeiaDeProvedoresIa, modeloPertenceAoProvedor, ProvedoresDaConfiguracaoIa, validarProvedoresDaConfiguracaoIa } from './provedor-ia';

const ANTHROPIC = { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'claude-opus-5-5' };
const GOOGLE = { modeloRapido: 'gemini-flash', modeloPadrao: 'gemini-pro', modeloAnalitico: 'gemini-pro-max' };
const OPENAI = { modeloRapido: 'gpt-mini', modeloPadrao: 'gpt-5', modeloAnalitico: 'o3' };

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const base = (parcial: Partial<ProvedoresDaConfiguracaoIa> = {}): ProvedoresDaConfiguracaoIa => ({
  provedor: A,
  fallbacks: [],
  modelosProvedor: { [A]: ANTHROPIC },
  ...parcial,
});

test('modeloPertenceAoProvedor reconhece o prefixo de cada provedor e ignora caixa e espaços', () => {
  assert.equal(modeloPertenceAoProvedor(A, ' Claude-Sonnet-5-5 '), true);
  assert.equal(modeloPertenceAoProvedor(G, 'gemini-2.5-pro'), true);
  assert.equal(modeloPertenceAoProvedor(O, 'gpt-5'), true);
  assert.equal(modeloPertenceAoProvedor(O, 'o4-mini'), true);
  assert.equal(modeloPertenceAoProvedor(A, 'gpt-5'), false);
  assert.equal(modeloPertenceAoProvedor(G, 'claude-haiku-5-5'), false);
  assert.equal(modeloPertenceAoProvedor(O, 'omni-1'), false);
});

test('cadeiaDeProvedoresIa põe o padrão primeiro e segue a ordem dos fallbacks', () => {
  assert.deepEqual(cadeiaDeProvedoresIa({ provedor: G, fallbacks: [O, A] }), [G, O, A]);
});

test('configuração coerente, com ou sem cadeia, não tem erro', () => {
  assert.deepEqual(validarProvedoresDaConfiguracaoIa(base()), []);
  assert.deepEqual(validarProvedoresDaConfiguracaoIa(base({ fallbacks: [G, O], modelosProvedor: { [A]: ANTHROPIC, [G]: GOOGLE, [O]: OPENAI } })), []);
});

test('trocar o padrão e voltar: os modelos do provedor que saiu da cadeia ficam guardados e valem de novo', () => {
  const guardados = { [A]: ANTHROPIC, [G]: GOOGLE };
  assert.deepEqual(validarProvedoresDaConfiguracaoIa({ provedor: G, fallbacks: [], modelosProvedor: guardados }), []);
  assert.deepEqual(validarProvedoresDaConfiguracaoIa({ provedor: A, fallbacks: [], modelosProvedor: guardados }), []);
});

test('provedor da cadeia sem modelos, ou com um nível vazio, é recusado', () => {
  const semGoogle = validarProvedoresDaConfiguracaoIa(base({ fallbacks: [G] }));
  assert.deepEqual(semGoogle, ['Google está na cadeia, mas não tem os modelos informados']);

  const nivelVazio = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: { ...ANTHROPIC, modeloRapido: '  ' } } }));
  assert.deepEqual(nivelVazio, ['Anthropic está na cadeia, mas o modelo rápido não foi informado']);
});

test('modelo de outro provedor é recusado, no padrão, no fallback e também no provedor guardado fora da cadeia', () => {
  const noPadrao = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: { ...ANTHROPIC, modeloRapido: 'gemini-flash' } } }));
  assert.deepEqual(noPadrao, ['O modelo rápido "gemini-flash" não é de Anthropic']);

  const noFallback = validarProvedoresDaConfiguracaoIa(
    base({ fallbacks: [G], modelosProvedor: { [A]: ANTHROPIC, [G]: { ...GOOGLE, modeloAnalitico: 'gpt-5' } } }),
  );
  assert.deepEqual(noFallback, ['O modelo analítico "gpt-5" não é de Google']);

  const foraDaCadeia = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: ANTHROPIC, [O]: { ...OPENAI, modeloPadrao: 'claude-sonnet-5-5' } } }));
  assert.deepEqual(foraDaCadeia, ['O modelo padrão "claude-sonnet-5-5" não é de OpenAI']);
});

test('trio incompleto de provedor fora da cadeia é tolerado só se estiver vazio; texto inválido é recusado', () => {
  const vazio = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: ANTHROPIC, [G]: { modeloRapido: '', modeloPadrao: '', modeloAnalitico: '' } } }));
  assert.deepEqual(vazio, []);
  const invalido = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: ANTHROPIC, [G]: { ...GOOGLE, modeloRapido: 7 as never } } }));
  assert.deepEqual(invalido, ['O modelo rápido de Google é inválido']);
});

test('modelo com mais de 100 caracteres e chave que não é provedor são recusados', () => {
  const longo = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: { ...ANTHROPIC, modeloRapido: `claude-${'x'.repeat(100)}` } } }));
  assert.deepEqual(longo, ['O modelo rápido de Anthropic passa de 100 caracteres']);
  const estranha = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: { [A]: ANTHROPIC, MISTRAL: GOOGLE } as never }));
  assert.deepEqual(estranha, ['"MISTRAL" não é um provedor de IA']);
  const herdada = validarProvedoresDaConfiguracaoIa(base({ modelosProvedor: JSON.parse('{"ANTHROPIC": {"modeloRapido":"claude-a","modeloPadrao":"claude-b","modeloAnalitico":"claude-c"}, "constructor": {}}') }));
  assert.deepEqual(herdada, ['"constructor" não é um provedor de IA'], 'chave herdada do Object não passa por provedor');
});

test('provedor repetido na cadeia (inclusive o padrão) e cadeia maior que o máximo são recusados', () => {
  assert.match(validarProvedoresDaConfiguracaoIa(base({ fallbacks: [A] }))[0], /Anthropic aparece mais de uma vez/);
  const todos = { [A]: ANTHROPIC, [G]: GOOGLE, [O]: OPENAI };
  assert.match(validarProvedoresDaConfiguracaoIa(base({ fallbacks: [G, G], modelosProvedor: todos }))[0], /Google aparece mais de uma vez/);
  assert.ok(validarProvedoresDaConfiguracaoIa(base({ fallbacks: [G, O, A], modelosProvedor: todos })).some((erro) => /no máximo 2/.test(erro)));
});
