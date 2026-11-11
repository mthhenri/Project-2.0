import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { pareceMarkdown } from './parece-markdown';

test('reconhece os sinais de Markdown que o editor sabe formatar', () => {
    const textos = [
        '**Olá!** Seja bem vindo',
        'isto é __forte__',
        'isto é ~~riscado~~',
        'rode `npm test` antes',
        'veja [o site](https://exemplo.com)',
        '# Título',
        '### Seção 3',
        '- item\n- outro',
        '* item',
        '1. um\n2. dois',
        '> citação',
        '```ts\nconst a = 1;\n```',
        '| a | b |\n| --- | --- |\n| 1 | 2 |',
        'a | b\n:-- | --:\n1 | 2',
    ];
    for (const texto of textos) assert.equal(pareceMarkdown(texto), true, JSON.stringify(texto));
});

test('texto puro, vazio ou com asteriscos soltos não é Markdown', () => {
    const textos = [
        '',
        '   \n  ',
        'Olá, tudo bem?',
        'linha um\nlinha dois\nlinha três',
        '2 * 3 * 4 = 24',
        'preço: R$ 10 - 20% de desconto',
        'a #hashtag no meio',
        '1.5 litros',
        '[colchetes] e (parênteses) sem link',
        'veja [site](ftp://exemplo.com)',
    ];
    for (const texto of textos) assert.equal(pareceMarkdown(texto), false, JSON.stringify(texto));
});
