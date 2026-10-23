import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TextSelection } from '@milkdown/kit/prose/state';
import { editorViewCtx } from '@milkdown/kit/core';
import { EditorFormatado, normalizarMarkdown, semQuebraFinal } from './markdown-formatado';

const SEM_OUVINTES = { aoMudar: () => undefined, aoAtualizar: () => undefined, aoSair: () => undefined };

/** Construções que o `interpretarMarkdown` entende e que o editor grava exatamente como estão. */
const CANONICAS = [
  '**negrito** e *itálico* e ~~tachado~~ e `código`',
  '# Título 1\n\n## Título 2\n\ntexto',
  '- a\n- b\n  - c',
  '1. um\n2. dois',
  '- [ ] tarefa\n- [x] feita',
  '> citação\n> segunda',
  '```\ncódigo\n```',
  '---',
  '[link](https://exemplo.com)',
  'linha um\nlinha dois',
  'primeiro\n\nsegundo',
];

test('semQuebraFinal tira só as quebras de linha do fim', () => {
  assert.equal(semQuebraFinal('texto\n'), 'texto');
  assert.equal(semQuebraFinal('a\n\nb\n\n'), 'a\n\nb');
  assert.equal(semQuebraFinal(''), '');
});

test('texto canônico volta idêntico (ida e volta estável)', async () => {
  for (const texto of CANONICAS) {
    assert.equal(await normalizarMarkdown(texto), texto, JSON.stringify(texto));
  }
});

test('normalizar é idempotente, inclusive para variantes de escrita', async () => {
  const variantes = [
    '* item estrela\n* outro',
    'a\n\n\nb',
    '## 17/10\nfiz X\nfiz Y',
    '__negrito__ e _it_',
    '<script>alert(1)</script>',
    '| a | b |\n|---|---|\n| 1 | 2 |',
    '![imagem](https://exemplo.com/a.png)',
  ];
  for (const texto of variantes) {
    const uma = await normalizarMarkdown(texto);
    assert.equal(await normalizarMarkdown(uma), uma, JSON.stringify(texto));
  }
});

test('variantes viram a forma do projeto', async () => {
  assert.equal(await normalizarMarkdown('* a\n* b'), '- a\n- b');
  assert.equal(await normalizarMarkdown('a\n\n\nb'), 'a\n\nb');
});

test('vazio fica vazio', async () => {
  assert.equal(await normalizarMarkdown(''), '');
});

test('HTML cru no texto nunca vira marcação: é só texto do nó', async () => {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, 'oi <img src=x onerror="alert(1)"> <script>alert(2)</script>', SEM_OUVINTES);
  // Comparações booleanas: um `assert.equal` com um elemento do DOM imprimiria a árvore inteira ao falhar.
  assert.ok(raiz.querySelector('script') === null, 'nenhum <script> na página');
  assert.ok(raiz.querySelector('img:not(.ProseMirror-separator)') === null, 'nenhuma <img> do texto');
  assert.ok(raiz.querySelector('[onerror]') === null, 'nenhum atributo onerror');
  assert.ok(raiz.textContent?.includes('<script>'));
  await editor.destruir();
});

function selecionar(editor: EditorFormatado, trecho: string): void {
  editor.acao((contexto) => {
    const view = contexto.get(editorViewCtx);
    let inicio = -1;
    view.state.doc.descendants((no, posicao) => {
      if (inicio < 0 && no.isText && no.text?.includes(trecho)) inicio = posicao + (no.text?.indexOf(trecho) ?? 0);
      return inicio < 0;
    });
    assert.ok(inicio >= 0, `trecho não encontrado: ${trecho}`);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, inicio, inicio + trecho.length)));
  });
}

test('"Enviar para" leva o bloco inteiro da seleção, em Markdown', async () => {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, 'um **parágrafo** formatado\n\n- item um\n- item dois\n\n## Título', SEM_OUVINTES);

  selecionar(editor, 'formatado');
  assert.equal(editor.blocoSelecionadoEmMarkdown(), 'um **parágrafo** formatado');

  selecionar(editor, 'item dois');
  assert.equal(editor.blocoSelecionadoEmMarkdown(), '- item dois');

  selecionar(editor, 'Título');
  assert.equal(editor.blocoSelecionadoEmMarkdown(), '## Título');
  await editor.destruir();
});

test('parágrafo vazio no editor não vira <br /> no Markdown', async () => {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, 'um\n\ndois', SEM_OUVINTES);
  editor.acao((contexto) => {
    const view = contexto.get(editorViewCtx);
    const vazio = view.state.schema.nodes['paragraph'].create();
    view.dispatch(view.state.tr.insert(view.state.doc.content.size, vazio));
  });
  const markdown = editor.obterMarkdown();
  assert.ok(!markdown.includes('<br'), JSON.stringify(markdown));
  assert.equal(markdown, 'um\n\ndois');
  await editor.destruir();
});

test('sem seleção não há bloco para enviar', async () => {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, 'texto', SEM_OUVINTES);
  assert.equal(editor.temSelecao(), false);
  assert.equal(editor.blocoSelecionadoEmMarkdown(), '');
  await editor.destruir();
});

test('definirMarkdown troca o conteúdo e obterMarkdown devolve o novo texto', async () => {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, 'antigo', SEM_OUVINTES);
  editor.definirMarkdown('**novo** texto');
  assert.equal(editor.obterMarkdown(), '**novo** texto');
  await editor.destruir();
});

async function comEditor(markdown: string, corpo: (editor: EditorFormatado) => void): Promise<void> {
  const raiz = document.createElement('div');
  document.body.appendChild(raiz);
  const editor = await EditorFormatado.criar(raiz, markdown, SEM_OUVINTES);
  try {
    corpo(editor);
  } finally {
    await editor.destruir();
  }
}

function cursorApos(editor: EditorFormatado, trecho: string): void {
  editor.acao((contexto) => {
    const view = contexto.get(editorViewCtx);
    let fim = -1;
    view.state.doc.descendants((no, posicao) => {
      if (fim < 0 && no.isText && no.text?.includes(trecho)) fim = posicao + (no.text?.indexOf(trecho) ?? 0) + trecho.length;
      return fim < 0;
    });
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, fim)));
  });
}

test('negrito é interruptor e vale para a palavra do cursor', async () => {
  await comEditor('uma palavra aqui', (editor) => {
    cursorApos(editor, 'palavra');
    editor.executar('negrito');
    assert.equal(editor.obterMarkdown(), 'uma **palavra** aqui');
    editor.executar('negrito');
    assert.equal(editor.obterMarkdown(), 'uma palavra aqui');
  });
});

test('lista: o mesmo botão tira o item; o outro tipo troca a lista', async () => {
  await comEditor('- a'+'\n- b', (editor) => {
    cursorApos(editor, 'b');
    editor.executar('numerada');
    assert.equal(editor.obterMarkdown(), '1. a'+'\n2. b');
    editor.executar('numerada');
    assert.ok(!editor.obterMarkdown().includes('2. b'), editor.obterMarkdown());
  });
});

test('tarefa é interruptor sobre o item da lista', async () => {
  await comEditor('- a', (editor) => {
    cursorApos(editor, 'a');
    editor.executar('tarefa');
    assert.equal(editor.obterMarkdown(), '- [ ] a');
    editor.executar('tarefa');
    assert.equal(editor.obterMarkdown(), '- a');
  });
});

test('título e citação saem do bloco quando já estão nele', async () => {
  await comEditor('texto', (editor) => {
    cursorApos(editor, 'texto');
    editor.executar('titulo1');
    assert.equal(editor.obterMarkdown(), '# texto');
    editor.executar('titulo1');
    assert.equal(editor.obterMarkdown(), 'texto');
    editor.executar('citacao');
    assert.equal(editor.obterMarkdown(), '> texto');
    editor.executar('citacao');
    assert.equal(editor.obterMarkdown(), 'texto');
  });
});

// --- capacidades para o compositor do chat (task 218) ---------------------------------------------

function selecionarTrecho(editor: EditorFormatado, trecho: string): void {
  editor.acao((contexto) => {
    const view = contexto.get(editorViewCtx);
    let inicio = -1;
    view.state.doc.descendants((no, posicao) => {
      if (inicio < 0 && no.isText && no.text?.includes(trecho)) inicio = posicao + (no.text?.indexOf(trecho) ?? 0);
      return inicio < 0;
    });
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, inicio, inicio + trecho.length)));
  });
}

test('blocoAtual devolve o texto do bloco, o cursor nele e a posição do bloco; com seleção ou em bloco de código, nada', async () => {
  await comEditor('primeiro\n\nvaleu @Cam', (editor) => {
    cursorApos(editor, 'Cam');
    const bloco = editor.blocoAtual()!;
    assert.equal(bloco.texto, 'valeu @Cam');
    assert.equal(bloco.cursor, 'valeu @Cam'.length);
    assert.ok(bloco.base > 0);

    selecionarTrecho(editor, 'valeu');
    assert.equal(editor.blocoAtual(), null);
  });
  await comEditor('```\ncódigo\n```', (editor) => {
    cursorApos(editor, 'código');
    assert.equal(editor.blocoAtual(), null);
  });
});

test('substituirNoBlocoAtual troca o trecho do bloco e deixa o cursor depois do que entrou', async () => {
  await comEditor('valeu @Cam', (editor) => {
    cursorApos(editor, 'Cam');
    editor.substituirNoBlocoAtual(6, 10, '@Camila Duarte ');
    // O espaço do fim fica no Markdown (só as quebras finais saem): quem envia faz o `trim`.
    assert.equal(editor.obterMarkdown(), 'valeu @Camila Duarte ');
    const bloco = editor.blocoAtual()!;
    assert.equal(bloco.texto, 'valeu @Camila Duarte ');
    assert.equal(bloco.cursor, bloco.texto.length);

    editor.substituirNoBlocoAtual(bloco.cursor - 1, bloco.cursor, '');
    assert.equal(editor.blocoAtual()!.texto, 'valeu @Camila Duarte');
  });
});

test('inserirTexto troca a seleção ou insere no cursor', async () => {
  await comEditor('abc', (editor) => {
    cursorApos(editor, 'abc');
    editor.inserirTexto('!');
    assert.equal(editor.obterMarkdown(), 'abc!');
    selecionarTrecho(editor, 'abc');
    editor.inserirTexto('xyz');
    assert.equal(editor.obterMarkdown(), 'xyz!');
    assert.equal(editor.textoSelecionado(), '');
  });
});

test('inserirBlocoDeCodigo: no parágrafo vazio entra no lugar dele; com texto, depois; leva a linguagem e o cursor fica depois', async () => {
  await comEditor('', (editor) => {
    editor.inserirBlocoDeCodigo('const a = 1;\n', 'ts');
    assert.equal(editor.obterMarkdown(), '```ts\nconst a = 1;\n```');
    editor.inserirTexto('depois');
    assert.equal(editor.obterMarkdown(), '```ts\nconst a = 1;\n```\n\ndepois');
  });
  await comEditor('veja:', (editor) => {
    cursorApos(editor, 'veja');
    editor.inserirBlocoDeCodigo('print(1)', 'py');
    assert.equal(editor.obterMarkdown(), 'veja:\n\n```py\nprint(1)\n```');
  });
  await comEditor('', (editor) => {
    editor.inserirBlocoDeCodigo('x', null);
    assert.equal(editor.obterMarkdown(), '```\nx\n```');
  });
});

test('inserirBlocoDeCodigo troca o trecho selecionado', async () => {
  await comEditor('antes\n\nconst a = 1;\n\nfim', (editor) => {
    selecionarTrecho(editor, 'const a = 1;');
    editor.inserirBlocoDeCodigo('const a = 2;', 'js');
    assert.equal(editor.obterMarkdown(), 'antes\n\n```js\nconst a = 2;\n```\n\nfim');
  });
});

test('contextoDoCursor distingue lista, código e citação', async () => {
  await comEditor('- item\n\n> citação\n\n```\ncódigo\n```\n\ncomum', (editor) => {
    cursorApos(editor, 'item');
    assert.deepEqual(editor.contextoDoCursor(), { emLista: true, emCodigo: false, emCitacao: false });
    cursorApos(editor, 'citação');
    assert.deepEqual(editor.contextoDoCursor(), { emLista: false, emCodigo: false, emCitacao: true });
    cursorApos(editor, 'código');
    assert.deepEqual(editor.contextoDoCursor(), { emLista: false, emCodigo: true, emCitacao: false });
    cursorApos(editor, 'comum');
    assert.deepEqual(editor.contextoDoCursor(), { emLista: false, emCodigo: false, emCitacao: false });
  });
});

test('dividirBloco: parágrafo novo fora de lista, item novo dentro, item vazio sai da lista; nunca quebra dura', async () => {
  await comEditor('um', (editor) => {
    cursorApos(editor, 'um');
    editor.dividirBloco();
    editor.inserirTexto('dois');
    assert.equal(editor.obterMarkdown(), 'um\n\ndois');
    assert.ok(!editor.obterMarkdown().includes('\\'));
  });
  await comEditor('- a', (editor) => {
    cursorApos(editor, 'a');
    editor.dividirBloco();
    editor.inserirTexto('b');
    assert.equal(editor.obterMarkdown(), '- a\n- b');
    editor.dividirBloco();
    editor.dividirBloco();
    editor.inserirTexto('fora');
    assert.equal(editor.obterMarkdown(), '- a\n- b\n\nfora');
  });
});

test('textoSelecionado devolve o texto sem formatação; o retângulo da seleção tem a forma esperada (o jsdom mede zero); limpar esvazia', async () => {
  await comEditor('uma **palavra** aqui', (editor) => {
    selecionarTrecho(editor, 'palavra');
    assert.equal(editor.textoSelecionado(), 'palavra');
    const retangulo = editor.retanguloDaSelecao();
    assert.ok(retangulo === null || ['esquerda', 'direita', 'topo', 'base'].every((lado) => typeof retangulo[lado as keyof typeof retangulo] === 'number'));
    editor.limpar();
    assert.equal(editor.obterMarkdown(), '');
  });
});
