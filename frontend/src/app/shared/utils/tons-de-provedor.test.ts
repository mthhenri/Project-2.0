import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { NivelIaEnum } from '@project20/shared';
import { TONS_DO_PROVEDOR, tomMedioDoProvedor } from './tons-de-provedor';

test('o tom médio é o do nível padrão: laranja Anthropic, azul Google e cinza OpenAI', () => {
    assert.equal(tomMedioDoProvedor('ANTHROPIC'), '#f97316');
    assert.equal(tomMedioDoProvedor('GOOGLE'), '#3b82f6');
    assert.equal(tomMedioDoProvedor('OPENAI'), '#6b7280');
});

test('todo provedor tem os três níveis, do mais claro ao mais escuro', () => {
    for (const tons of Object.values(TONS_DO_PROVEDOR)) assert.deepEqual(Object.keys(tons).sort(), Object.values(NivelIaEnum).sort());
});
