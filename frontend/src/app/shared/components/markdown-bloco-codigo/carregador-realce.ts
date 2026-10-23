import { TokenDeRealce, TrechoDeCodigo, tokensParaTrechos } from './realce-codigo';

/** Gramáticas do Prism, cada uma baixada só quando um bloco precisa dela (cada `import()` vira um pedaço separado do pacote). */
const GRAMATICAS: Record<string, () => Promise<unknown>> = {
  clike: () => import('prismjs/components/prism-clike'),
  markup: () => import('prismjs/components/prism-markup'),
  'markup-templating': () => import('prismjs/components/prism-markup-templating'),
  css: () => import('prismjs/components/prism-css'),
  javascript: () => import('prismjs/components/prism-javascript'),
  typescript: () => import('prismjs/components/prism-typescript'),
  php: () => import('prismjs/components/prism-php'),
  csharp: () => import('prismjs/components/prism-csharp'),
  java: () => import('prismjs/components/prism-java'),
  python: () => import('prismjs/components/prism-python'),
  sql: () => import('prismjs/components/prism-sql'),
  scss: () => import('prismjs/components/prism-scss'),
  json: () => import('prismjs/components/prism-json'),
  bash: () => import('prismjs/components/prism-bash'),
  yaml: () => import('prismjs/components/prism-yaml'),
};

/** O que cada gramática estende: tem de estar carregada antes dela. */
const DEPENDENCIAS: Record<string, string[]> = {
  javascript: ['clike'],
  typescript: ['javascript'],
  php: ['markup-templating'],
  'markup-templating': ['markup'],
  csharp: ['clike'],
  java: ['clike'],
  scss: ['css'],
};

interface NucleoDoPrism {
  languages: Record<string, unknown>;
  tokenize(texto: string, gramatica: unknown): (string | TokenDeRealce)[];
}

let nucleo: Promise<NucleoDoPrism> | null = null;
const gramaticasCarregadas = new Map<string, Promise<void>>();

/** O núcleo do Prism, uma vez só. As gramáticas procuram o `Prism` global, então ele é publicado antes de elas serem importadas. */
function carregarNucleo(): Promise<NucleoDoPrism> {
  nucleo ??= (async () => {
    // `manual`: o Prism não varre a página sozinho; só tokenizamos o que o componente pede.
    (globalThis as { Prism?: unknown }).Prism = { manual: true, disableWorkerMessageHandler: true };
    const modulo = (await import('prismjs/components/prism-core')) as unknown as { default?: NucleoDoPrism } & NucleoDoPrism;
    const prism = modulo.default ?? modulo;
    (globalThis as { Prism?: unknown }).Prism = prism;
    return prism;
  })();
  // Carga que falhou (rede, página fechando) não fica guardada: a próxima tentativa recomeça em vez de repetir o erro até recarregar a página.
  nucleo.catch(() => {
    nucleo = null;
  });
  return nucleo;
}

function carregarGramatica(nome: string): Promise<void> {
  let carga = gramaticasCarregadas.get(nome);
  if (!carga) {
    carga = (async () => {
      await carregarNucleo();
      for (const dependencia of DEPENDENCIAS[nome] ?? []) await carregarGramatica(dependencia);
      await GRAMATICAS[nome]();
    })();
    gramaticasCarregadas.set(nome, carga);
    carga.catch(() => gramaticasCarregadas.delete(nome));
  }
  return carga;
}

/**
 * Prepara o realce de uma gramática (baixa o núcleo e a gramática na primeira vez) e devolve a função que transforma código em trechos.
 * Falha (rede, gramática ausente) rejeita: quem chama mostra o código sem realce.
 */
export async function carregarRealce(gramatica: string): Promise<(codigo: string) => TrechoDeCodigo[]> {
  if (!GRAMATICAS[gramatica]) throw new Error(`Sem gramática para ${gramatica}`);
  await carregarGramatica(gramatica);
  const prism = await carregarNucleo();
  const definicao = prism.languages[gramatica];
  if (!definicao) throw new Error(`Gramática ${gramatica} não registrada`);
  return (codigo) => tokensParaTrechos(prism.tokenize(codigo, definicao));
}
