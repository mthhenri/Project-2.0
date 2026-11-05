import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { filtrarModelosDaAnthropic, filtrarModelosDaOpenAi, filtrarModelosDoGoogle, TRECHOS_DE_OUTRA_FUNCAO_NA_OPENAI } from './ia-modelos-filtro';

// Listas de exemplo no formato mínimo que cada adaptador lê do SDK (spec 309).

test('Anthropic: só o ciclo de vida active, nome amigável, do mais novo ao mais antigo; sem nome amigável, o id', () => {
    const modelos = filtrarModelosDaAnthropic([
        { id: 'claude-haiku-5-5', display_name: 'Claude Haiku 5.5', lifecycle: 'active', created_at: '2026-01-10T00:00:00Z' },
        { id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', lifecycle: 'active', created_at: '2026-03-01T00:00:00Z' },
        { id: 'claude-sonnet-4', display_name: 'Claude Sonnet 4', lifecycle: 'deprecated', created_at: '2025-05-01T00:00:00Z' },
        { id: 'claude-velho-1', display_name: 'Velho', lifecycle: 'retired', created_at: '2023-05-01T00:00:00Z' },
        { id: 'claude-sem-nome', display_name: '  ', lifecycle: 'active', created_at: '2026-02-01T00:00:00Z' },
        { id: 'gpt-5', display_name: 'Não é da Anthropic', lifecycle: 'active', created_at: '2026-04-01T00:00:00Z' },
    ]);
    assert.deepEqual(modelos, [
        { id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' },
        { id: 'claude-sem-nome', nome: 'claude-sem-nome' },
        { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5' },
    ]);
});

test('OpenAI: só prefixo de chat, sem os de outra função, sem os desligados; o nome é o id', () => {
    const agora = new Date('2026-11-05T12:00:00Z');
    const modelos = filtrarModelosDaOpenAi(
        [
            { id: 'gpt-5', created: 1_760_000_000 },
            { id: 'gpt-5-mini', created: 1_761_000_000 },
            { id: 'o3', created: 1_750_000_000 },
            { id: 'chatgpt-4o-latest', created: 1_700_000_000 },
            { id: 'text-embedding-3-small', created: 1_740_000_000 },
            { id: 'whisper-1', created: 1_600_000_000 },
            { id: 'tts-1', created: 1_600_000_000 },
            { id: 'gpt-4o-transcribe', created: 1_740_000_000 },
            { id: 'gpt-4o-audio-preview', created: 1_740_000_000 },
            { id: 'gpt-4o-realtime-preview', created: 1_740_000_000 },
            { id: 'gpt-image-1', created: 1_740_000_000 },
            { id: 'dall-e-3', created: 1_740_000_000 },
            { id: 'omni-moderation-latest', created: 1_740_000_000 },
            { id: 'sora-2', created: 1_740_000_000 },
            { id: 'gpt-4o-search-preview', created: 1_740_000_000 },
            { id: 'gpt-4-desligado', created: 1_500_000_000, shutdown_date: '2026-06-01' },
            { id: 'gpt-4-vai-sair', created: 1_500_000_000, shutdown_date: '2027-06-01' },
        ],
        agora,
    );
    assert.deepEqual(modelos.map((modelo) => modelo.id), ['gpt-5-mini', 'gpt-5', 'o3', 'chatgpt-4o-latest', 'gpt-4-vai-sair']);
    assert.ok(modelos.every((modelo) => modelo.nome === modelo.id));
});

test('OpenAI: a lista de trechos excluídos é constante nomeada e cobre as funções que não são chat', () => {
    for (const trecho of ['embedding', 'whisper', 'tts', 'transcribe', 'audio', 'realtime', 'image', 'dall-e', 'moderation', 'sora', 'search']) {
        assert.ok(TRECHOS_DE_OUTRA_FUNCAO_NA_OPENAI.includes(trecho), trecho);
    }
});

test('Google: generateContent entre as ações, prefixo e sem os de outra função; id sem o models/; nome amigável; ordem por nome', () => {
    const gera = ['generateContent'];
    const modelos = filtrarModelosDoGoogle([
        { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportedActions: gera },
        { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedActions: gera },
        { name: 'models/gemini-embedding-001', displayName: 'Embedding', supportedActions: ['embedContent'] },
        { name: 'models/gemini-2.0-flash-preview-image-generation', displayName: 'Imagem', supportedActions: gera },
        { name: 'models/gemini-2.5-flash-preview-tts', displayName: 'Voz', supportedActions: gera },
        { name: 'models/aqa', displayName: 'AQA', supportedActions: ['generateAnswer'] },
        { name: 'models/imagen-4.0-generate', displayName: 'Imagen', supportedActions: ['predict'] },
        { name: 'models/veo-3.0', displayName: 'Veo', supportedActions: ['predictLongRunning'] },
        { name: 'models/text-bison', displayName: 'Bison', supportedActions: gera },
        { name: 'models/gemma-3-27b-it', displayName: '', supportedActions: gera },
        { name: '', displayName: 'Sem nome', supportedActions: gera },
        { displayName: 'Sem nada' },
    ]);
    assert.deepEqual(modelos, [
        { id: 'gemini-2.5-flash', nome: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', nome: 'Gemini 2.5 Pro' },
        { id: 'gemma-3-27b-it', nome: 'gemma-3-27b-it' },
    ]);
});

test('lista vazia (ou sem nenhum modelo de texto) volta vazia nos três provedores', () => {
    assert.deepEqual(filtrarModelosDaAnthropic([]), []);
    assert.deepEqual(filtrarModelosDaOpenAi([]), []);
    assert.deepEqual(filtrarModelosDoGoogle([]), []);
    assert.deepEqual(filtrarModelosDaOpenAi([{ id: 'whisper-1' }, { id: 'dall-e-3' }]), []);
});
