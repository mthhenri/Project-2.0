import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { interpretarMarkdown, MarkdownBlocoNo, MarkdownInlineNo } from '@project20/shared';
import { converterHtmlParaMarkdown, pareceHtmlDoQuill } from './html-para-markdown';

const converter = (html: string): string => converterHtmlParaMarkdown(html).markdown;

/** Texto visível do Markdown, lido pelo interpretador da task 121: prova que o conteúdo sobrevive. */
function textoVisivel(markdown: string): string {
  const inline = (nos: MarkdownInlineNo[]): string =>
    nos.map((no) => {
      switch (no.tipo) {
        case 'texto': case 'codigo': return no.valor;
        case 'quebra': return '\n';
        default: return inline(no.filhos);
      }
    }).join('');
  const blocos = (lista: MarkdownBlocoNo[]): string[] =>
    lista.flatMap((bloco) => {
      switch (bloco.tipo) {
        case 'titulo': case 'paragrafo': return [inline(bloco.filhos)];
        case 'bloco-codigo': return [bloco.valor];
        case 'citacao': return blocos(bloco.filhos);
        case 'regua': return ['---'];
        case 'lista': {
          const itens = (l: typeof bloco): string[] => l.itens.flatMap((item) => [inline(item.filhos), ...item.sublistas.flatMap(itens)]);
          return itens(bloco);
        }
      }
    });
  return blocos(interpretarMarkdown(markdown)).join('\n');
}

// --- Detecção ----------------------------------------------------------------------------------

test('pareceHtmlDoQuill reconhece a saída do Quill e ignora Markdown', () => {
  assert.equal(pareceHtmlDoQuill('<p>oi</p>'), true);
  assert.equal(pareceHtmlDoQuill('  <ol><li data-list="bullet">a</li></ol>'), true);
  assert.equal(pareceHtmlDoQuill('<h1>t</h1><p>x</p>'), true);
  assert.equal(pareceHtmlDoQuill('# título\n\n- item'), false);
  assert.equal(pareceHtmlDoQuill('<p>sem fechamento'), false);
  assert.equal(pareceHtmlDoQuill(''), false);
  assert.equal(pareceHtmlDoQuill(null), false);
});

// --- Parágrafos --------------------------------------------------------------------------------

test('parágrafos seguidos viram linhas seguidas e o vazio vira linha em branco', () => {
  assert.equal(converter('<p>um</p><p>dois</p>'), 'um\ndois');
  assert.equal(converter('<p>um</p><p><br></p><p>dois</p>'), 'um\n\ndois');
  assert.equal(converter('<p>um</p><p></p><p><br></p><p>dois</p>'), 'um\n\ndois');
  assert.equal(converter('<p><br></p><p>texto</p><p><br></p>'), 'texto');
});

test('<br> dentro do parágrafo vira quebra de linha', () => {
  assert.equal(converter('<p>a<br>b</p>'), 'a\nb');
});

test('entidades são decodificadas e &nbsp; vira espaço', () => {
  assert.equal(converter('<p>a&nbsp;b &amp; c &lt;d&gt; &quot;e&quot; &#39;f&#39; &#x41;</p>'), 'a b & c \\<d> "e" \'f\' A');
});

test('amostra real do banco: parágrafos curtos e muitos &nbsp;', () => {
  const html = '<p>1312&nbsp;2312&nbsp;&nbsp;&nbsp;a</p><p>1</p><p>1a</p><p>sf</p>';
  assert.equal(converter(html), '1312 2312   a\n1\n1a\nsf');
});

// --- Inline ------------------------------------------------------------------------------------

test('negrito, itálico, tachado e código', () => {
  assert.equal(converter('<p><strong>b</strong> <em>i</em> <s>t</s> <code>c</code></p>'), '**b** *i* ~~t~~ `c`');
  assert.equal(converter('<p><b>b</b><i>i</i><strike>t</strike></p>'), '**b***i*~~t~~');
});

test('ênfase com espaço colado por dentro move o espaço para fora', () => {
  assert.equal(converter('<p>a<strong> b </strong>c</p>'), 'a **b** c');
  assert.equal(converter('<p><em> </em>x</p>'), ' x'.trim());
});

test('ênfase aninhada e combinada', () => {
  assert.equal(converter('<p><strong><em>x</em></strong></p>'), '***x***');
  assert.equal(converter('<p><strong>a <em>b</em> c</strong></p>'), '**a *b* c**');
});

test('sublinhado perde a marca, mantém o texto e é contado', () => {
  const resultado = converterHtmlParaMarkdown('<p>a <u>b</u> c <u>d</u></p>');
  assert.equal(resultado.markdown, 'a b c d');
  assert.equal(resultado.perdas.sublinhado, 2);
});

test('código com crase dentro usa cerca maior', () => {
  assert.equal(converter('<p><code>a`b</code></p>'), '``a`b``');
});

test('links permitidos viram [texto](url); os demais ficam só com o texto', () => {
  assert.equal(converter('<p><a href="https://x.com/a?b=1" target="_blank">site</a></p>'), '[site](https://x.com/a?b=1)');
  assert.equal(converter('<p><a href="mailto:a@b.com">mail</a></p>'), '[mail](mailto:a@b.com)');
  const perigoso = converterHtmlParaMarkdown('<p><a href="javascript:alert(1)">clique</a> e <a href="/ponto">rel</a></p>');
  assert.equal(perigoso.markdown, 'clique e rel');
  assert.equal(perigoso.perdas.linksRemovidos, 2);
  assert.equal(converter('<p><a href="https://x.com/f(1)">f</a></p>'), '[f](https://x.com/f%281%29)');
});

test('imagem some e é contada', () => {
  const resultado = converterHtmlParaMarkdown('<p>antes<img src="data:image/png;base64,AAAA">depois</p>');
  assert.equal(resultado.markdown, 'antesdepois');
  assert.equal(resultado.perdas.imagens, 1);
});

test('span e atributos de estilo passam só o texto', () => {
  assert.equal(converter('<p><span style="color: red;" class="ql-size-large">x</span></p>'), 'x');
});

// --- Escape ------------------------------------------------------------------------------------

test('texto com marcação literal é escapado e volta idêntico quando lido', () => {
  const html = '<p>2 * 3 * 4 e snake_case e [x] e `y` e ~~z~~ e a_b_ <b>c</b></p>';
  const markdown = converter(html);
  assert.equal(textoVisivel(markdown), '2 * 3 * 4 e snake_case e [x] e `y` e ~~z~~ e a_b_ c');
});

test('início de linha que seria bloco é escapado', () => {
  for (const [entrada, esperado] of [
    ['# não é título', '# não é título'],
    ['> não é citação', '> não é citação'],
    ['- não é lista', '- não é lista'],
    ['1. não é lista', '1. não é lista'],
    ['---', '---'],
    ['+ nem este', '+ nem este'],
  ]) {
    const markdown = converter(`<p>${entrada}</p>`);
    const blocos = interpretarMarkdown(markdown);
    assert.equal(blocos.length, 1, entrada);
    assert.equal(blocos[0].tipo, 'paragrafo', `${entrada} virou ${blocos[0].tipo}`);
    assert.equal(textoVisivel(markdown), esperado);
  }
});

test('HTML digitado como texto (entidades) não vira HTML nem reconverte', () => {
  const markdown = converter('<p>&lt;p&gt;oi&lt;/p&gt; &lt;script&gt;x&lt;/script&gt;</p>');
  assert.equal(pareceHtmlDoQuill(markdown), false);
  assert.equal(textoVisivel(markdown), '<p>oi</p> <script>x</script>');
});

test('script e style são descartados', () => {
  assert.equal(converter('<p>a</p><script>alert(1)</script><style>p{}</style><p>b</p>'), 'a\nb');
});

// --- Blocos ------------------------------------------------------------------------------------

test('títulos h1 a h6 (h5 e h6 viram nível 4)', () => {
  assert.equal(converter('<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>'), '# a\n\n## b\n\n### c\n\n#### d\n\n#### e\n\n#### f');
  assert.equal(converter('<h2>a <strong>b</strong></h2>'), '## a **b**');
});

test('citação: uma <blockquote> por linha vira uma citação só', () => {
  assert.equal(converter('<blockquote>um</blockquote><blockquote>dois</blockquote><p>fora</p>'), '> um\n> dois\n\nfora');
});

test('bloco de código do Quill preserva o texto literal', () => {
  const html = '<pre class="ql-syntax" spellcheck="false">const a = **x** &lt;b&gt;;\n  recuo\n</pre>';
  assert.equal(converter(html), '```\nconst a = **x** <b>;\n  recuo\n```');
});

test('bloco de código com crases dentro usa cerca maior', () => {
  assert.equal(converter('<pre>a ``` b</pre>'), '````\na ``` b\n````');
});

test('blocos separados por linha em branco', () => {
  assert.equal(converter('<p>antes</p><h2>t</h2><p>depois</p>'), 'antes\n\n## t\n\ndepois');
});

// --- Listas ------------------------------------------------------------------------------------

test('lista do Quill 2 com os quatro tipos de item', () => {
  const html =
    '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>a</li>' +
    '<li data-list="ordered"><span class="ql-ui"></span>b</li>' +
    '<li data-list="ordered"><span class="ql-ui"></span>c</li>' +
    '<li data-list="unchecked"><span class="ql-ui"></span>d</li>' +
    '<li data-list="checked"><span class="ql-ui"></span>e</li></ol>';
  assert.equal(converter(html), '- a\n1. b\n2. c\n- [ ] d\n- [x] e');
});

test('lista aninhada por ql-indent-N', () => {
  const html =
    '<ol><li data-list="bullet">pai</li>' +
    '<li data-list="bullet" class="ql-indent-1">filho</li>' +
    '<li data-list="ordered" class="ql-indent-2">neto 1</li>' +
    '<li data-list="ordered" class="ql-indent-2">neto 2</li>' +
    '<li data-list="bullet">outro</li></ol>';
  assert.equal(converter(html), '- pai\n  - filho\n    1. neto 1\n    2. neto 2\n- outro');
});

test('salto de recuo maior que 1 é limitado ao nível seguinte', () => {
  const html = '<ol><li data-list="bullet">a</li><li data-list="bullet" class="ql-indent-4">b</li></ol>';
  assert.equal(converter(html), '- a\n  - b');
});

test('listas clássicas ul/ol com li aninhado e checklist do Quill 1', () => {
  assert.equal(converter('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'), '- a\n  - b\n- c');
  assert.equal(converter('<ol><li>x</li><li>y</li></ol>'), '1. x\n2. y');
  assert.equal(converter('<ul data-checked="true"><li>ok</li></ul>'), '- [x] ok');
});

test('item de lista com texto que parece tarefa é escapado', () => {
  const markdown = converter('<ol><li data-list="bullet">[ ] literal</li></ol>');
  const [lista] = interpretarMarkdown(markdown);
  assert.equal((lista as { itens: { tarefa: string | null }[] }).itens[0].tarefa, null);
});

test('lista entre parágrafos vai separada por linha em branco', () => {
  assert.equal(converter('<p>antes</p><ol><li data-list="bullet">a</li></ol><p>depois</p>'), 'antes\n\n- a\n\ndepois');
});

// --- Fidelidade de ponta a ponta e robustez -------------------------------------------------------

test('documento misto lido pelo interpretador mantém o texto visível', () => {
  const html =
    '<h2>Plano</h2><p>Fazer <strong>isto</strong> e <em>aquilo</em>.</p>' +
    '<ol><li data-list="bullet">um</li><li data-list="bullet" class="ql-indent-1">dois</li></ol>' +
    '<blockquote>citação</blockquote><pre class="ql-syntax">codigo()\n</pre>';
  assert.equal(textoVisivel(converter(html)), 'Plano\nFazer isto e aquilo.\num\ndois\ncitação\ncodigo()');
});

test('é idempotente na prática: o resultado não é detectado como HTML', () => {
  const entradas = ['<p>oi</p>', '<h1>t</h1><p>x</p>', '<ol><li data-list="bullet">a</li></ol>', '<pre>a</pre>'];
  for (const entrada of entradas) assert.equal(pareceHtmlDoQuill(converter(entrada)), false, entrada);
});

test('HTML malformado nunca lança', () => {
  for (const entrada of ['<p>sem fechar', '</p></p>', '<<>>', '<p attr="aberto>x</p>', '<a href=>x</a>', '<p>a</b></p>', '<!-- x', '&bogus; &#999999999;']) {
    assert.doesNotThrow(() => converterHtmlParaMarkdown(entrada), entrada);
  }
});

test('entrada grande termina em tempo curto (linear)', () => {
  const grande = '<p>texto <strong>forte</strong> &amp; mais</p>'.repeat(20000);
  const inicio = process.hrtime.bigint();
  converterHtmlParaMarkdown(grande);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  assert.ok(ms < 3000, `${ms.toFixed(0)} ms`);
  const profundo = '<div>'.repeat(5000) + 'x' + '</div>'.repeat(5000);
  assert.doesNotThrow(() => converterHtmlParaMarkdown(profundo));
});
