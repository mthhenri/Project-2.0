import { describe, expect, it } from 'vitest';
import { desindentar, diferencaDeTexto, indentar, quebrarLinha } from './editor-codigo.util';

// Regras puras do editor de código (task 216): Tab, Shift+Tab e Enter.

describe('indentar (Tab)', () => {
  it('sem seleção insere um nível de recuo no cursor', () => {
    expect(indentar('ab', 1, 1)).toEqual({ texto: 'a  b', inicio: 3, fim: 3 });
  });

  it('com seleção recua todas as linhas tocadas e a seleção continua cobrindo o mesmo conteúdo', () => {
    const texto = 'a\nb\nc';
    const resultado = indentar(texto, 0, 5);
    expect(resultado.texto).toBe('  a\n  b\n  c');
    expect(resultado.texto.slice(resultado.inicio, resultado.fim)).toBe('a\n  b\n  c');
  });

  it('seleção no meio de uma linha recua a linha inteira', () => {
    const resultado = indentar('const a = 1;', 6, 7);
    expect(resultado.texto).toBe('  const a = 1;');
    expect(resultado.texto.slice(resultado.inicio, resultado.fim)).toBe('a');
  });

  it('uma seleção que termina no começo de uma linha não toca essa linha', () => {
    expect(indentar('a\nb', 0, 2).texto).toBe('  a\nb');
  });

  it('linhas em branco não ganham espaços sobrando', () => {
    expect(indentar('a\n\nb', 0, 4).texto).toBe('  a\n\n  b');
  });
});

describe('desindentar (Shift+Tab)', () => {
  it('tira um nível das linhas tocadas', () => {
    const resultado = desindentar('    a\n  b', 0, 9);
    expect(resultado.texto).toBe('  a\nb');
  });

  it('com só um espaço de recuo tira esse espaço; sem recuo não muda nada', () => {
    expect(desindentar(' a', 2, 2).texto).toBe('a');
    expect(desindentar('a', 1, 1)).toEqual({ texto: 'a', inicio: 1, fim: 1 });
  });

  it('tira um tab inteiro', () => {
    expect(desindentar('\ta', 2, 2).texto).toBe('a');
  });

  it('o cursor acompanha e nunca passa para antes do começo da linha', () => {
    expect(desindentar('  a', 3, 3)).toEqual({ texto: 'a', inicio: 1, fim: 1 });
    expect(desindentar('x\n  a', 3, 3)).toEqual({ texto: 'x\na', inicio: 2, fim: 2 });
  });
});

describe('quebrarLinha (Enter)', () => {
  it('mantém o recuo da linha atual', () => {
    const resultado = quebrarLinha('  foo();', 8, 8);
    expect(resultado.texto).toBe('  foo();\n  ');
    expect(resultado.inicio).toBe(resultado.texto.length);
  });

  it.each([['{'], ['('], ['['], [':']])('depois de %s abre um nível a mais', (abertura) => {
    const resultado = quebrarLinha(`  if x ${abertura}`, 7 + abertura.length, 7 + abertura.length);
    expect(resultado.texto).toBe(`  if x ${abertura}\n    `);
  });

  it('entre um par recém-aberto, o fechamento desce e o cursor fica na linha do meio', () => {
    const resultado = quebrarLinha('function f() {}', 14, 14);
    expect(resultado.texto).toBe('function f() {\n  \n}');
    expect(resultado.inicio).toBe('function f() {\n  '.length);
    expect(resultado.fim).toBe(resultado.inicio);
  });

  it('o par recuado mantém o recuo do fechamento', () => {
    const resultado = quebrarLinha('  a = [];', 7, 7).texto;
    expect(resultado).toBe('  a = [\n    \n  ];');
  });

  it('abertura seguida de texto na mesma linha não desce o fechamento', () => {
    expect(quebrarLinha('f(a, b)', 2, 2).texto).toBe('f(\n  a, b)');
  });

  it('com seleção, substitui o trecho pela quebra', () => {
    expect(quebrarLinha('abcd', 1, 3).texto).toBe('a\nd');
  });

  it('no começo do texto não inventa recuo', () => {
    expect(quebrarLinha('', 0, 0)).toEqual({ texto: '\n', inicio: 1, fim: 1 });
  });
});

describe('diferencaDeTexto', () => {
  it('textos iguais não trocam nada', () => {
    expect(diferencaDeTexto('abc', 'abc')).toEqual({ inicio: 3, fimAntigo: 3, inserido: '' });
  });

  it('acha só o trecho que mudou, no meio, no começo e no fim', () => {
    expect(diferencaDeTexto('a\nb\nc', 'a\n  b\nc')).toEqual({ inicio: 2, fimAntigo: 2, inserido: '  ' });
    expect(diferencaDeTexto('b', '  b')).toEqual({ inicio: 0, fimAntigo: 0, inserido: '  ' });
    expect(diferencaDeTexto('ab', 'abcd')).toEqual({ inicio: 2, fimAntigo: 2, inserido: 'cd' });
  });

  it('remoção devolve o trecho vazio; troca devolve os dois lados', () => {
    expect(diferencaDeTexto('a  b', 'ab')).toEqual({ inicio: 1, fimAntigo: 3, inserido: '' });
    expect(diferencaDeTexto('xaz', 'xbz')).toEqual({ inicio: 1, fimAntigo: 2, inserido: 'b' });
  });

  it('prefixo e sufixo repetidos não se sobrepõem', () => {
    expect(diferencaDeTexto('aa', 'aaa')).toEqual({ inicio: 2, fimAntigo: 2, inserido: 'a' });
  });
});
