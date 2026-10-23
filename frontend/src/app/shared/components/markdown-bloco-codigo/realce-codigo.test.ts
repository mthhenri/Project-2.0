import { describe, it, expect } from 'vitest';
import { LINGUAGENS_DO_EDITOR, linguagemDoRealce, rotuloDoBloco, ROTULO_DA_LINGUAGEM, TokenDeRealce, tokensParaTrechos } from './realce-codigo';

describe('LINGUAGENS_DO_EDITOR', () => {
  it('cada nome de cerca volta para a própria gramática e para o rótulo do bloco (o que o editor insere é o que o bloco mostra)', () => {
    for (const linguagem of LINGUAGENS_DO_EDITOR) {
      expect(linguagemDoRealce(linguagem.cerca), linguagem.cerca).toBe(linguagem.gramatica);
      expect(rotuloDoBloco(linguagem.cerca), linguagem.cerca).toBe(linguagem.rotulo);
    }
  });

  it('cobre todas as linguagens com realce, sem repetir', () => {
    expect(LINGUAGENS_DO_EDITOR.map((linguagem) => linguagem.gramatica).sort()).toEqual(Object.keys(ROTULO_DA_LINGUAGEM).sort());
    expect(new Set(LINGUAGENS_DO_EDITOR.map((linguagem) => linguagem.cerca)).size).toBe(LINGUAGENS_DO_EDITOR.length);
  });
});

// Lógica pura do realce (task 189): que linguagem é e como os tokens viram os trechos do template.

describe('linguagemDoRealce', () => {
  it.each([
    ['ts', 'typescript'], ['TypeScript', 'typescript'], ['js', 'javascript'], ['jsx', 'javascript'], ['php', 'php'],
    ['cs', 'csharp'], ['csharp', 'csharp'], ['c#', 'csharp'], ['java', 'java'], ['py', 'python'], ['python', 'python'],
    ['sql', 'sql'], ['html', 'markup'], ['xml', 'markup'], ['css', 'css'], ['scss', 'scss'], ['json', 'json'],
    ['sh', 'bash'], ['shell', 'bash'], ['bash', 'bash'], ['yml', 'yaml'], ['yaml', 'yaml'],
  ])('apelido %s vale a gramática %s', (informada, gramatica) => {
    expect(linguagemDoRealce(informada)).toBe(gramatica);
  });

  it('ignora caixa e espaços nas pontas', () => {
    expect(linguagemDoRealce('  PHP ')).toBe('php');
  });

  it.each([[null], [undefined], [''], ['   '], ['cobol'], ['brainfuck']])('ausente ou desconhecida (%s) não tem realce', (informada) => {
    expect(linguagemDoRealce(informada)).toBeNull();
  });

  it('toda linguagem do rótulo tem ao menos um apelido que a alcança', () => {
    for (const gramatica of Object.keys(ROTULO_DA_LINGUAGEM)) {
      const alcancada = ['ts', 'js', 'php', 'cs', 'java', 'py', 'sql', 'html', 'css', 'scss', 'json', 'sh', 'yml'].some((apelido) => linguagemDoRealce(apelido) === gramatica);
      expect(alcancada, gramatica).toBe(true);
    }
  });
});

describe('rotuloDoBloco', () => {
  it('linguagem conhecida mostra o rótulo, por qualquer apelido', () => {
    expect(rotuloDoBloco('ts')).toBe('TypeScript');
    expect(rotuloDoBloco('cs')).toBe('C#');
    expect(rotuloDoBloco('html')).toBe('HTML');
  });

  it('desconhecida mostra o que veio na cerca; ausente não mostra nada', () => {
    expect(rotuloDoBloco('cobol')).toBe('cobol');
    expect(rotuloDoBloco(null)).toBeNull();
    expect(rotuloDoBloco('  ')).toBeNull();
  });
});

describe('tokensParaTrechos', () => {
  const token = (type: string, content: TokenDeRealce['content']): TokenDeRealce => ({ type, content });

  it('texto solto vira trecho comum e token vira trecho do seu tipo, na ordem', () => {
    expect(tokensParaTrechos(['const ', token('keyword', 'if'), ' x'])).toEqual([
      { texto: 'const ', tipo: null }, { texto: 'if', tipo: 'keyword' }, { texto: ' x', tipo: null },
    ]);
  });

  it('trechos vizinhos do mesmo tipo se juntam', () => {
    expect(tokensParaTrechos(['a', 'b', token('string', 'c'), token('string', 'd'), 'e'])).toEqual([
      { texto: 'ab', tipo: null }, { texto: 'cd', tipo: 'string' }, { texto: 'e', tipo: null },
    ]);
  });

  it('token dentro de token usa o próprio tipo e o texto solto herda o do pai', () => {
    const interpolada = token('template-string', ['`oi ', token('interpolation', ['${', token('variable', 'nome'), '}']), '`']);
    expect(tokensParaTrechos([interpolada])).toEqual([
      { texto: '`oi ', tipo: 'template-string' },
      { texto: '${', tipo: 'interpolation' },
      { texto: 'nome', tipo: 'variable' },
      { texto: '}', tipo: 'interpolation' },
      { texto: '`', tipo: 'template-string' },
    ]);
  });

  it('a concatenação dos trechos devolve o código original, com recuo e quebras de linha', () => {
    const original = 'function  f() {\n\treturn "a<b>&c";\n}\n';
    const trechos = tokensParaTrechos(['function ', token('function', ' f'), '() {\n\t', token('keyword', 'return'), ' ', token('string', '"a<b>&c"'), ';\n}\n']);
    expect(trechos.map((trecho) => trecho.texto).join('')).toBe(original);
  });

  it('tipo com caracteres fora de [a-z0-9-] vira nome seguro; sem nada que sobre, herda o do pai', () => {
    expect(tokensParaTrechos([token('Key Word!', 'x')])).toEqual([{ texto: 'x', tipo: 'keyword' }]);
    expect(tokensParaTrechos([token('string', [token('###', 'y')])])).toEqual([{ texto: 'y', tipo: 'string' }]);
  });

  it('trechos vazios não aparecem e lista vazia dá lista vazia', () => {
    expect(tokensParaTrechos(['', token('keyword', ''), 'a'])).toEqual([{ texto: 'a', tipo: null }]);
    expect(tokensParaTrechos([])).toEqual([]);
  });
});
