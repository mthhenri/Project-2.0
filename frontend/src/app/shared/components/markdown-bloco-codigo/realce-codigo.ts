/**
 * Lógica pura do realce de código (task 189): que linguagem é, e como os tokens de um tokenizador (Prism) viram os trechos que o
 * template desenha. Nada aqui conhece o Prism nem o DOM; o template só monta `<span>` com a classe de cada trecho, sem HTML injetado.
 */

/** O token como o Prism o devolve: tipo, conteúdo (texto ou mais tokens) e apelidos de tipo. */
export interface TokenDeRealce {
  type: string;
  content: string | (string | TokenDeRealce)[];
  alias?: string | string[];
}

/** Um trecho do código: o texto e, quando é um token, o tipo (`keyword`, `string`...); `null` é texto comum. */
export interface TrechoDeCodigo {
  texto: string;
  tipo: string | null;
}

/** As linguagens com realce, pelo nome de gramática do Prism, e o rótulo mostrado no cabeçalho do bloco. */
export const ROTULO_DA_LINGUAGEM: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  php: 'PHP',
  csharp: 'C#',
  java: 'Java',
  python: 'Python',
  sql: 'SQL',
  markup: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  bash: 'Bash',
  yaml: 'YAML',
};

/** Uma linguagem oferecida pelo editor de código: a gramática do realce, o nome curto que vai na cerca (` ```ts `) e o rótulo mostrado. */
export interface LinguagemDoEditor {
  gramatica: string;
  cerca: string;
  rotulo: string;
}

/** As linguagens do seletor do editor (task 216), na ordem em que aparecem. Todo `cerca` é um apelido que `linguagemDoRealce` resolve para a `gramatica`. */
export const LINGUAGENS_DO_EDITOR: LinguagemDoEditor[] = [
  { gramatica: 'typescript', cerca: 'ts', rotulo: ROTULO_DA_LINGUAGEM['typescript'] },
  { gramatica: 'javascript', cerca: 'js', rotulo: ROTULO_DA_LINGUAGEM['javascript'] },
  { gramatica: 'php', cerca: 'php', rotulo: ROTULO_DA_LINGUAGEM['php'] },
  { gramatica: 'csharp', cerca: 'cs', rotulo: ROTULO_DA_LINGUAGEM['csharp'] },
  { gramatica: 'java', cerca: 'java', rotulo: ROTULO_DA_LINGUAGEM['java'] },
  { gramatica: 'python', cerca: 'py', rotulo: ROTULO_DA_LINGUAGEM['python'] },
  { gramatica: 'sql', cerca: 'sql', rotulo: ROTULO_DA_LINGUAGEM['sql'] },
  { gramatica: 'markup', cerca: 'html', rotulo: ROTULO_DA_LINGUAGEM['markup'] },
  { gramatica: 'css', cerca: 'css', rotulo: ROTULO_DA_LINGUAGEM['css'] },
  { gramatica: 'scss', cerca: 'scss', rotulo: ROTULO_DA_LINGUAGEM['scss'] },
  { gramatica: 'json', cerca: 'json', rotulo: ROTULO_DA_LINGUAGEM['json'] },
  { gramatica: 'bash', cerca: 'bash', rotulo: ROTULO_DA_LINGUAGEM['bash'] },
  { gramatica: 'yaml', cerca: 'yaml', rotulo: ROTULO_DA_LINGUAGEM['yaml'] },
];

const APELIDOS: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  php: 'php',
  cs: 'csharp',
  csharp: 'csharp',
  'c#': 'csharp',
  java: 'java',
  py: 'python',
  python: 'python',
  sql: 'sql',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  markup: 'markup',
  css: 'css',
  scss: 'scss',
  json: 'json',
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
};

/** A gramática (nome do Prism) de uma linguagem informada na cerca do bloco, ou `null` se ausente ou desconhecida (sem realce). */
export function linguagemDoRealce(informada: string | null | undefined): string | null {
  const nome = informada?.trim().toLowerCase();
  return nome ? (APELIDOS[nome] ?? null) : null;
}

/** O que o cabeçalho do bloco mostra: o rótulo da linguagem conhecida, ou o texto que veio na cerca; `null` sem linguagem. */
export function rotuloDoBloco(informada: string | null | undefined): string | null {
  const texto = informada?.trim();
  if (!texto) return null;
  const gramatica = linguagemDoRealce(texto);
  return gramatica ? ROTULO_DA_LINGUAGEM[gramatica] : texto;
}

/** Tipo de token seguro para virar nome de classe CSS (`template-string` passa; o resto cai fora). */
function tipoSeguro(tipo: string): string | null {
  const limpo = tipo.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return limpo.length > 0 ? limpo : null;
}

/**
 * Achata os tokens em trechos na ordem do texto. Um token dentro de outro (a interpolação de uma string de modelo) usa o próprio tipo;
 * texto solto dentro de um token herda o tipo dele. Trechos vizinhos de mesmo tipo se juntam, então a concatenação dos textos devolve o
 * código original, letra por letra.
 */
export function tokensParaTrechos(tokens: (string | TokenDeRealce)[]): TrechoDeCodigo[] {
  const trechos: TrechoDeCodigo[] = [];
  const acrescentar = (texto: string, tipo: string | null) => {
    if (texto === '') return;
    const ultimo = trechos.at(-1);
    if (ultimo && ultimo.tipo === tipo) ultimo.texto += texto;
    else trechos.push({ texto, tipo });
  };
  const percorrer = (itens: (string | TokenDeRealce)[], herdado: string | null) => {
    for (const item of itens) {
      if (typeof item === 'string') {
        acrescentar(item, herdado);
        continue;
      }
      const tipo = tipoSeguro(item.type) ?? herdado;
      if (typeof item.content === 'string') acrescentar(item.content, tipo);
      else percorrer(item.content, tipo);
    }
  };
  percorrer(tokens, null);
  return trechos;
}
