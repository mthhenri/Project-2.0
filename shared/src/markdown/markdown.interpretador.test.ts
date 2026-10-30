import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { interpretarMarkdown } from './markdown.interpretador';
import type { MarkdownBlocoNo, MarkdownInlineNo } from './markdown.tipos';

const texto = (valor: string): MarkdownInlineNo => ({ tipo: 'texto', valor });

function paragrafo(markdown: string): MarkdownInlineNo[] {
  const blocos = interpretarMarkdown(markdown);
  assert.equal(blocos.length, 1, `esperava 1 bloco para ${JSON.stringify(markdown)}`);
  const bloco = blocos[0];
  assert.equal(bloco.tipo, 'paragrafo');
  return (bloco as Extract<MarkdownBlocoNo, { tipo: 'paragrafo' }>).filhos;
}

/** Percorre a árvore e junta todo o texto, para provar que nada de HTML virou nó. */
function tiposDeNo(valor: unknown, acumulado = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) valor.forEach((item) => tiposDeNo(item, acumulado));
  else if (valor && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    if (typeof objeto.tipo === 'string') acumulado.add(objeto.tipo);
    Object.values(objeto).forEach((item) => tiposDeNo(item, acumulado));
  }
  return acumulado;
}

// --- Blocos ------------------------------------------------------------------------------------

test('texto vazio ou só espaços não gera nada', () => {
  assert.deepEqual(interpretarMarkdown(''), []);
  assert.deepEqual(interpretarMarkdown('   \n\t\n  '), []);
});

test('títulos de 1 a 4; 5 ou mais # e # colado viram parágrafo', () => {
  const blocos = interpretarMarkdown('# Um\n## Dois\n### Três\n#### Quatro\n##### Cinco\n#colado');
  assert.deepEqual(
    blocos.slice(0, 4).map((b) => (b.tipo === 'titulo' ? b.nivel : null)),
    [1, 2, 3, 4],
  );
  assert.equal(blocos[4].tipo, 'paragrafo');
  assert.deepEqual(blocos[0], { tipo: 'titulo', nivel: 1, filhos: [texto('Um')] });
});

test('título aceita fechamento com # e ênfase', () => {
  const [titulo] = interpretarMarkdown('## 17/10 ##');
  assert.deepEqual(titulo, { tipo: 'titulo', nivel: 2, filhos: [texto('17/10')] });
  const [enfase] = interpretarMarkdown('# **Forte**');
  assert.deepEqual(enfase, { tipo: 'titulo', nivel: 1, filhos: [{ tipo: 'negrito', filhos: [texto('Forte')] }] });
});

test('parágrafos separados por linha em branco; quebra de linha vira quebra', () => {
  const blocos = interpretarMarkdown('primeira\nsegunda\n\nterceira');
  assert.equal(blocos.length, 2);
  assert.deepEqual((blocos[0] as { filhos: MarkdownInlineNo[] }).filhos, [texto('primeira'), { tipo: 'quebra' }, texto('segunda')]);
});

test('terminadores de linha \\r\\n e \\r equivalem a \\n', () => {
  assert.deepEqual(interpretarMarkdown('a\r\nb\rc'), interpretarMarkdown('a\nb\nc'));
});

test('régua com ---, *** e ___ (e com espaços)', () => {
  for (const regua of ['---', '***', '___', '- - -', '  ----  ']) {
    assert.deepEqual(interpretarMarkdown(regua), [{ tipo: 'regua' }], regua);
  }
  assert.equal(interpretarMarkdown('--')[0].tipo, 'paragrafo');
});

test('bloco de código cercado preserva o conteúdo literal e a linguagem', () => {
  const [bloco] = interpretarMarkdown('```ts\nconst a = **x** <b>y</b>;\n  recuo\n```');
  assert.deepEqual(bloco, { tipo: 'bloco-codigo', linguagem: 'ts', valor: 'const a = **x** <b>y</b>;\n  recuo' });
});

test('bloco de código sem fechamento vai até o fim do texto', () => {
  const blocos = interpretarMarkdown('```\nlinha 1\nlinha 2');
  assert.deepEqual(blocos, [{ tipo: 'bloco-codigo', linguagem: null, valor: 'linha 1\nlinha 2' }]);
});

test('citação com conteúdo em bloco e citação aninhada', () => {
  const [citacao] = interpretarMarkdown('> # Título\n> texto\n>> interna');
  assert.equal(citacao.tipo, 'citacao');
  const filhos = (citacao as { filhos: MarkdownBlocoNo[] }).filhos;
  assert.equal(filhos[0].tipo, 'titulo');
  assert.equal(filhos[1].tipo, 'paragrafo');
  assert.equal(filhos[2].tipo, 'citacao');
});

// --- Listas ------------------------------------------------------------------------------------

test('lista com e sem ordem, com início numérico', () => {
  const [sem, ordenada] = interpretarMarkdown('- a\n- b\n\n3. c\n4. d');
  assert.deepEqual(sem, {
    tipo: 'lista', ordenada: false, inicio: 1,
    itens: [
      { tarefa: null, filhos: [texto('a')], sublistas: [] },
      { tarefa: null, filhos: [texto('b')], sublistas: [] },
    ],
  });
  assert.equal((ordenada as { ordenada: boolean; inicio: number }).ordenada, true);
  assert.equal((ordenada as { inicio: number }).inicio, 3);
});

test('listas aninhadas por recuo, com os dois tipos de marcador', () => {
  const [lista] = interpretarMarkdown('- pai\n  - filho\n    1. neto\n- outro');
  const raiz = lista as { itens: { sublistas: { ordenada: boolean; itens: { sublistas: unknown[] }[] }[] }[] };
  assert.equal(raiz.itens.length, 2);
  assert.equal(raiz.itens[0].sublistas.length, 1);
  assert.equal(raiz.itens[0].sublistas[0].itens[0].sublistas.length, 1);
  assert.equal(raiz.itens[1].sublistas.length, 0);
});

test('lista de tarefas marca e desmarca', () => {
  const [lista] = interpretarMarkdown('- [ ] fazer\n- [x] feito\n- [X] feito também\n- [] não é tarefa');
  const itens = (lista as { itens: { tarefa: string | null }[] }).itens;
  assert.deepEqual(itens.map((i) => i.tarefa), ['desmarcada', 'marcada', 'marcada', null]);
});

test('mudar o tipo de lista no primeiro nível abre uma nova lista', () => {
  const blocos = interpretarMarkdown('- a\n1. b');
  assert.deepEqual(blocos.map((b) => b.tipo), ['lista', 'lista']);
});

test('linha sem marcador logo abaixo continua o item', () => {
  const [lista] = interpretarMarkdown('- primeira\ncontinua');
  const itens = (lista as { itens: { filhos: MarkdownInlineNo[] }[] }).itens;
  assert.equal(itens.length, 1);
  assert.deepEqual(itens[0].filhos, [texto('primeira'), { tipo: 'quebra' }, texto('continua')]);
});

test('"1990. foi um ano" no meio de um parágrafo não vira lista', () => {
  assert.equal(interpretarMarkdown('foi no\n1990. um ano').length, 1);
});

// --- Inline ------------------------------------------------------------------------------------

test('negrito, itálico, tachado e código', () => {
  assert.deepEqual(paragrafo('a **b** c'), [texto('a '), { tipo: 'negrito', filhos: [texto('b')] }, texto(' c')]);
  assert.deepEqual(paragrafo('*i* e _j_'), [
    { tipo: 'italico', filhos: [texto('i')] }, texto(' e '), { tipo: 'italico', filhos: [texto('j')] },
  ]);
  assert.deepEqual(paragrafo('~~x~~'), [{ tipo: 'tachado', filhos: [texto('x')] }]);
  assert.deepEqual(paragrafo('use `a *b* c`'), [texto('use '), { tipo: 'codigo', valor: 'a *b* c' }]);
  assert.deepEqual(paragrafo('__forte__'), [{ tipo: 'negrito', filhos: [texto('forte')] }]);
});

test('ênfase aninhada, inclusive ***x***', () => {
  assert.deepEqual(paragrafo('**a *b* c**'), [
    { tipo: 'negrito', filhos: [texto('a '), { tipo: 'italico', filhos: [texto('b')] }, texto(' c')] },
  ]);
  const tripla = paragrafo('***x***');
  assert.equal(tripla.length, 1);
  assert.deepEqual([...tiposDeNo(tripla)].sort(), ['italico', 'negrito', 'texto']);
});

test('sublinhado dentro de palavra não vira itálico (snake_case_nome)', () => {
  assert.deepEqual(paragrafo('use snake_case_nome aqui'), [texto('use snake_case_nome aqui')]);
});

test('marcadores sem fechamento ou cruzados viram texto', () => {
  assert.deepEqual(paragrafo('**sem fechar'), [texto('**sem fechar')]);
  assert.deepEqual(paragrafo('2 * 3 * 4'), [texto('2 * 3 * 4')]);
  assert.deepEqual(paragrafo('`sem fechar'), [texto('`sem fechar')]);
  assert.doesNotThrow(() => paragrafo('*a _b* c_'));
});

test('escape com barra invertida', () => {
  assert.deepEqual(paragrafo('\\*não é itálico\\*'), [texto('*não é itálico*')]);
});

test('links http, https e mailto com texto formatado', () => {
  assert.deepEqual(paragrafo('[site](https://exemplo.com/a?b=1)'), [
    { tipo: 'link', url: 'https://exemplo.com/a?b=1', filhos: [texto('site')] },
  ]);
  assert.deepEqual(paragrafo('[**mail**](mailto:a@b.com)'), [
    { tipo: 'link', url: 'mailto:a@b.com', filhos: [{ tipo: 'negrito', filhos: [texto('mail')] }] },
  ]);
  assert.equal((paragrafo('[x](HTTP://exemplo.com)')[0] as { tipo: string }).tipo, 'link');
});

test('link incompleto vira texto', () => {
  assert.deepEqual(paragrafo('[sem url]'), [texto('[sem url]')]);
  assert.deepEqual(paragrafo('[a](https://x.com'), [texto('[a](https://x.com')]);
  assert.deepEqual(paragrafo('[[a](https://x.com)'), [texto('['), { tipo: 'link', url: 'https://x.com', filhos: [texto('a')] }]);
});

// --- Segurança ---------------------------------------------------------------------------------

test('HTML embutido é texto literal, nunca nó', () => {
  const blocos = interpretarMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<b>negrito?</b>');
  assert.deepEqual(blocos.map((b) => b.tipo), ['paragrafo', 'paragrafo', 'paragrafo']);
  assert.deepEqual((blocos[0] as { filhos: MarkdownInlineNo[] }).filhos, [texto('<script>alert(1)</script>')]);
  assert.deepEqual([...tiposDeNo(blocos)].sort(), ['paragrafo', 'texto']);
});

test('entidades não são decodificadas', () => {
  assert.deepEqual(paragrafo('&lt;script&gt; &amp; &#60;b&#62;'), [texto('&lt;script&gt; &amp; &#60;b&#62;')]);
});

test('esquemas perigosos nunca viram link', () => {
  const vetores = [
    '[a](javascript:alert(1))',
    '[a](JaVaScRiPt:alert(1))',
    '[a](data:text/html,<script>alert(1)</script>)',
    '[a](vbscript:msgbox(1))',
    '[a](file:///etc/passwd)',
    '[a](//evil.com)',
    '[a](/ponto)',
    '[a](#ancora)',
    '[a](java\tscript:alert(1))',
    '[a](https://\u0000evil.com)',
    '[a](https://)',
    '[a]( https://x.com)',
  ];
  for (const vetor of vetores) {
    const tipos = tiposDeNo(interpretarMarkdown(vetor));
    assert.equal(tipos.has('link'), false, `gerou link para ${JSON.stringify(vetor)}`);
  }
});

test('imagem não existe: ![alt](url) fica como texto, sem link nem imagem', () => {
  for (const entrada of ['![alt](javascript:alert(1))', '![alt](https://exemplo.com/x.png)']) {
    const blocos = interpretarMarkdown(entrada);
    const tipos = tiposDeNo(blocos);
    assert.equal(tipos.has('link'), false, entrada);
    assert.equal(tipos.has('imagem'), false, entrada);
    assert.deepEqual((blocos[0] as { filhos: MarkdownInlineNo[] }).filhos, [texto(entrada)]);
  }
});

test('toda URL de link produzida passa pela lista de esquemas', () => {
  const entrada = '[a](https://a.com) [b](mailto:x@y.z) [c](javascript:1) [d](http://d.com/x)';
  const urls: string[] = [];
  const coletar = (nos: MarkdownInlineNo[]): void => {
    for (const no of nos) {
      if (no.tipo === 'link') urls.push(no.url);
      if ('filhos' in no) coletar(no.filhos);
    }
  };
  coletar(paragrafo(entrada));
  assert.deepEqual(urls, ['https://a.com', 'mailto:x@y.z', 'http://d.com/x']);
});

// --- Robustez e desempenho ---------------------------------------------------------------------

function mediar(entrada: string): number {
  const inicio = process.hrtime.bigint();
  interpretarMarkdown(entrada);
  return Number(process.hrtime.bigint() - inicio) / 1e6;
}

test('entradas patológicas grandes terminam em tempo curto (linear)', () => {
  const N = 100_000;
  const casos: Record<string, string> = {
    'asteriscos abertos': '*a '.repeat(N / 3),
    'sublinhados e asteriscos alternados': '*a _a '.repeat(N / 6),
    'pares de ** sem fechar': '**a '.repeat(N / 4),
    'crases alternadas': '`a ``b '.repeat(N / 7),
    'colchetes abertos': '['.repeat(N),
    'links sem fechar': '[a](x'.repeat(N / 5),
    'links com texto sem parêntese': '[a]('.repeat(N / 4),
    'barras invertidas': '\\'.repeat(N),
    'listas sem fim': '- a\n'.repeat(N / 4),
    'recuo crescente': Array.from({ length: 2000 }, (_, i) => ' '.repeat(i % 80) + '- x').join('\n'),
    'citações aninhadas': '>'.repeat(N),
    'títulos': '# a\n'.repeat(N / 4),
    'linhas com muitos espaços': ('# a' + ' '.repeat(2000) + 'x\n').repeat(50),
    'cercas': '```\n'.repeat(N / 4),
  };
  for (const [nome, entrada] of Object.entries(casos)) {
    const ms = mediar(entrada);
    assert.ok(ms < 1500, `${nome}: ${ms.toFixed(0)} ms`);
  }
});

test('aninhamento profundo é limitado e não estoura a pilha', () => {
  const fundo = '*a '.repeat(5000) + 'x' + '* '.repeat(5000);
  assert.doesNotThrow(() => interpretarMarkdown(fundo));
  assert.doesNotThrow(() => interpretarMarkdown('>'.repeat(5000) + ' x'));
  assert.doesNotThrow(() => interpretarMarkdown(Array.from({ length: 3000 }, (_, i) => ' '.repeat(i * 2) + '- x').join('\n')));
});

test('a mesma entrada produz sempre a mesma árvore', () => {
  const entrada = '# T\n\n- [x] a **b**\n  - c `d`\n\n> q [l](https://x.com)\n\n```\ncódigo\n```';
  assert.deepEqual(interpretarMarkdown(entrada), interpretarMarkdown(entrada));
  assert.deepEqual(JSON.parse(JSON.stringify(interpretarMarkdown(entrada))), interpretarMarkdown(entrada));
});

test('entrada que não é string não lança', () => {
  assert.deepEqual(interpretarMarkdown(undefined as unknown as string), []);
  assert.deepEqual(interpretarMarkdown(null as unknown as string), []);
});

// --- Tabelas, só sob pedido (P-039) ---

const COM_TABELAS = { tabelas: true };
const valoresDe = (celula: MarkdownInlineNo[]) => celula.map((no) => (no.tipo === 'texto' ? no.valor : `<${no.tipo}>`)).join('');

test('sem a opção, a tabela segue sendo texto (os editores não a criam)', () => {
  const blocos = interpretarMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
  assert.equal(blocos.length, 1);
  assert.equal(blocos[0].tipo, 'paragrafo');
});

test('tabela GFM: cabeçalho, alinhamentos e linhas, com formatação dentro das células', () => {
  const blocos = interpretarMarkdown('| Opção | Custo | Nota |\n|:---|---:|:---:|\n| **A** | 10 | `x` |\n| B | 20 | ok |', COM_TABELAS);
  assert.equal(blocos.length, 1);
  const tabela = blocos[0] as Extract<MarkdownBlocoNo, { tipo: 'tabela' }>;
  assert.equal(tabela.tipo, 'tabela');
  assert.deepEqual(tabela.alinhamentos, ['esquerda', 'direita', 'centro']);
  assert.deepEqual(tabela.cabecalho.map(valoresDe), ['Opção', 'Custo', 'Nota']);
  assert.deepEqual(tabela.linhas.map((linha) => linha.map(valoresDe)), [['<negrito>', '10', '<codigo>'], ['B', '20', 'ok']]);
});

test('tabela sem as barras das pontas, com barra escapada e com colunas faltando ou sobrando', () => {
  const blocos = interpretarMarkdown('a | b\n--- | ---\nx \\| y | z\n| 1 |\n1 | 2 | 3', COM_TABELAS);
  assert.equal(blocos.length, 1);
  const tabela = blocos[0] as Extract<MarkdownBlocoNo, { tipo: 'tabela' }>;
  assert.deepEqual(tabela.cabecalho.map(valoresDe), ['a', 'b']);
  assert.deepEqual(tabela.linhas.map((linha) => linha.map(valoresDe)), [['x | y', 'z'], ['1', ''], ['1', '2']]);
});

test('a linha sem barra encerra a tabela e o texto seguinte é outro bloco', () => {
  const blocos = interpretarMarkdown('| a |\n|---|\n| 1 |\n\nDepois da tabela.', COM_TABELAS);
  assert.deepEqual(blocos.map((bloco) => bloco.tipo), ['tabela', 'paragrafo']);
});

test('a tabela interrompe o parágrafo e pode ficar numa citação', () => {
  const colada = interpretarMarkdown('Veja:\n| a | b |\n|---|---|\n| 1 | 2 |', COM_TABELAS);
  assert.deepEqual(colada.map((bloco) => bloco.tipo), ['paragrafo', 'tabela']);
  const citada = interpretarMarkdown('> | a |\n> |---|\n> | 1 |', COM_TABELAS);
  assert.equal(citada[0].tipo, 'citacao');
  assert.equal((citada[0] as Extract<MarkdownBlocoNo, { tipo: 'citacao' }>).filhos[0].tipo, 'tabela');
});

test('o que parece tabela mas não é segue como texto: separação com outro número de colunas, sem barra, ou colunas demais', () => {
  assert.equal(interpretarMarkdown('| a | b |\n|---|', COM_TABELAS)[0].tipo, 'paragrafo');
  assert.equal(interpretarMarkdown('título\n---', COM_TABELAS)[0].tipo, interpretarMarkdown('título\n---')[0].tipo, 'a régua sob uma linha sem barra não vira tabela');
  assert.equal(interpretarMarkdown('a | b\nsem separação', COM_TABELAS)[0].tipo, 'paragrafo');
  const larga = Array.from({ length: 21 }, (_, i) => `c${i}`);
  assert.equal(interpretarMarkdown(`| ${larga.join(' | ')} |\n|${larga.map(() => '---').join('|')}|\n`, COM_TABELAS)[0].tipo, 'paragrafo');
});

test('tabela nunca vira HTML: marcação dentro da célula é texto', () => {
  const tabela = interpretarMarkdown('| <b>x</b> |\n|---|\n| <script>1</script> |', COM_TABELAS)[0] as Extract<MarkdownBlocoNo, { tipo: 'tabela' }>;
  assert.deepEqual(tabela.cabecalho.map(valoresDe), ['<b>x</b>']);
  assert.deepEqual([...tiposDeNo(tabela)].sort(), ['tabela', 'texto']);
});

test('tabela enorme é cortada no limite de linhas e termina rápido', () => {
  const linhas = Array.from({ length: 2000 }, (_, i) => `| ${i} |`).join('\n');
  const inicio = Date.now();
  const tabela = interpretarMarkdown(`| n |\n|---|\n${linhas}`, COM_TABELAS)[0] as Extract<MarkdownBlocoNo, { tipo: 'tabela' }>;
  assert.equal(tabela.linhas.length, 500);
  assert.ok(Date.now() - inicio < 1000);
});
