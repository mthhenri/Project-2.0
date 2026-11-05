import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfiguracaoIaCadeiaItemDto } from '../dtos/configuracao-ia/ConfiguracaoIaCadeiaItemDto';
import { EsforcoIaEnum } from '../enums/esforco-ia.enum';
import { NivelIaEnum } from '../enums/nivel-ia.enum';
import { TipoProvedorIaEnum } from '../enums/tipo-provedor-ia.enum';
import { cadeiaDoNivelIa, CadeiasDaConfiguracaoIa, modeloPertenceAoProvedor, rotuloDoNivelIa, validarCadeiasDaConfiguracaoIa } from './provedor-ia';

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

const base = (parcial: Partial<CadeiasDaConfiguracaoIa> = {}): CadeiasDaConfiguracaoIa => ({
    cadeiaRapido: [item(A, 'claude-haiku-5-5')],
    cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
    cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
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

test('cadeiaDoNivelIa devolve a cadeia do nível pedido e rotuloDoNivelIa o nome em português', () => {
    const configuracao = base({ cadeiaPadrao: [item(O, 'gpt-5'), item(A, 'claude-sonnet-5-5')] });
    assert.deepEqual(cadeiaDoNivelIa(configuracao, NivelIaEnum.RAPIDO), configuracao.cadeiaRapido);
    assert.deepEqual(cadeiaDoNivelIa(configuracao, NivelIaEnum.PADRAO), configuracao.cadeiaPadrao);
    assert.deepEqual(cadeiaDoNivelIa(configuracao, NivelIaEnum.ANALITICO), configuracao.cadeiaAnalitico);
    assert.equal(rotuloDoNivelIa(NivelIaEnum.ANALITICO), 'analítico');
});

test('configuração coerente não tem erro: uma cadeia pode ter um item, vários, e cada nível a sua', () => {
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base()), []);
    assert.deepEqual(
        validarCadeiasDaConfiguracaoIa(base({ cadeiaRapido: [item(O, 'gpt-5-mini', EsforcoIaEnum.ALTO), item(A, 'claude-haiku-5-5'), item(G, 'gemini-flash', EsforcoIaEnum.BAIXO)] })),
        [],
    );
});

test('o mesmo provedor pode estar em cadeias de níveis diferentes', () => {
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaPadrao: [item(A, 'claude-sonnet-5-5')] })), []);
});

test('cadeia vazia ou que não é lista é recusada, com o nome do nível', () => {
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaRapido: [] })), ['A cadeia do nível rápido precisa ter ao menos um item']);
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaAnalitico: undefined as never })), ['A cadeia do nível analítico precisa ter ao menos um item']);
});

test('provedor repetido na mesma cadeia é recusado', () => {
    const erros = validarCadeiasDaConfiguracaoIa(base({ cadeiaPadrao: [item(O, 'gpt-5'), item(A, 'claude-sonnet-5-5'), item(O, 'gpt-5-mini')] }));
    assert.deepEqual(erros, ['OpenAI aparece mais de uma vez na cadeia do nível padrão']);
});

test('modelo vazio, longo ou de outro provedor é recusado, citando item, provedor e nível', () => {
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaRapido: [item(A, '  ')] })), ['O modelo do item 1 (Anthropic) da cadeia do nível rápido não foi informado']);
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaRapido: [item(A, `claude-${'x'.repeat(100)}`)] })), [
        'O modelo do item 1 (Anthropic) da cadeia do nível rápido passa de 100 caracteres',
    ]);
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaAnalitico: [item(A, 'claude-opus-5-5'), item(G, 'gpt-5')] })), [
        'O modelo "gpt-5" não é de Google (cadeia do nível analítico)',
    ]);
});

test('esforço fora do enum e provedor desconhecido são recusados', () => {
    assert.deepEqual(validarCadeiasDaConfiguracaoIa(base({ cadeiaPadrao: [item(O, 'gpt-5', 'ENORME' as never)] })), ['O esforço do item 1 da cadeia do nível padrão é inválido']);
    const desconhecido = validarCadeiasDaConfiguracaoIa(base({ cadeiaPadrao: [{ provedor: 'MISTRAL' as never, modelo: 'mistral-large', esforco: EsforcoIaEnum.MEDIO }] }));
    assert.deepEqual(desconhecido, ['O provedor do item 1 da cadeia do nível padrão é inválido']);
    const herdada = validarCadeiasDaConfiguracaoIa(base({ cadeiaPadrao: [{ provedor: 'constructor' as never, modelo: 'gpt-5', esforco: EsforcoIaEnum.MEDIO }] }));
    assert.deepEqual(herdada, ['O provedor do item 1 da cadeia do nível padrão é inválido'], 'chave herdada do Object não passa por provedor');
});

test('item que não é objeto é recusado sem derrubar a validação dos outros', () => {
    const erros = validarCadeiasDaConfiguracaoIa(base({ cadeiaRapido: [null as never, item(A, 'claude-haiku-5-5')] }));
    assert.deepEqual(erros, ['O item 1 da cadeia do nível rápido é inválido']);
});

test('um erro de cada nível aparece junto, na ordem rápido, padrão, analítico', () => {
    const erros = validarCadeiasDaConfiguracaoIa({ cadeiaRapido: [], cadeiaPadrao: [], cadeiaAnalitico: [] });
    assert.equal(erros.length, 3);
    assert.match(erros[0], /rápido/);
    assert.match(erros[1], /padrão/);
    assert.match(erros[2], /analítico/);
});
