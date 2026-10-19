import { describe, it, expect } from 'vitest';
import { carregarRealce } from './carregador-realce';
import { ROTULO_DA_LINGUAGEM } from './realce-codigo';

// O Prism de verdade, uma gramática por linguagem da lista da task 189 (cada uma depende de outras: PHP de markup-templating,
// C# e Java de clike...): a ordem de carga está certa se o código sai realçado e a concatenação devolve o original.

const EXEMPLOS: Record<string, { codigo: string; tipoEsperado: string }> = {
  typescript: { codigo: 'const nome: string = "Ana"; // oi\nexport class A {}', tipoEsperado: 'keyword' },
  javascript: { codigo: 'function f(x) { return `a ${x}`; }', tipoEsperado: 'keyword' },
  php: { codigo: '<?php\n$total = count($lista); // soma\necho "oi";', tipoEsperado: 'variable' },
  csharp: { codigo: 'public class Parceiro { public string Nome { get; set; } }', tipoEsperado: 'keyword' },
  java: { codigo: 'public static void main(String[] args) { int x = 1; }', tipoEsperado: 'keyword' },
  python: { codigo: 'def soma(a, b):\n    return a + b  # soma', tipoEsperado: 'keyword' },
  sql: { codigo: "SELECT id, nome FROM usuario WHERE ativo = true;", tipoEsperado: 'keyword' },
  markup: { codigo: '<div class="a">oi</div>', tipoEsperado: 'tag' },
  css: { codigo: '.a { color: red; margin: 0 }', tipoEsperado: 'property' },
  scss: { codigo: '$cor: #fff;\n.a { &:hover { color: $cor; } }', tipoEsperado: 'variable' },
  json: { codigo: '{ "nome": "Ana", "idade": 3, "ativo": true }', tipoEsperado: 'property' },
  bash: { codigo: 'if [ -f "$ARQ" ]; then echo "ok"; fi', tipoEsperado: 'keyword' },
  yaml: { codigo: 'nome: Ana\nitens:\n  - a\n  - b', tipoEsperado: 'key' },
};

describe('carregarRealce (Prism real)', () => {
  it('há um exemplo para cada linguagem da lista', () => {
    expect(Object.keys(EXEMPLOS).sort()).toEqual(Object.keys(ROTULO_DA_LINGUAGEM).sort());
  });

  it.each(Object.entries(EXEMPLOS))('%s: realça e a concatenação devolve o código original', async (gramatica, { codigo, tipoEsperado }) => {
    const realcar = await carregarRealce(gramatica);
    const trechos = realcar(codigo);
    expect(trechos.map((trecho) => trecho.texto).join('')).toBe(codigo);
    expect(trechos.some((trecho) => trecho.tipo === tipoEsperado), `tipos achados: ${[...new Set(trechos.map((t) => t.tipo))].join(', ')}`).toBe(true);
  });

  it('código com < & > e ** não é interpretado: sai como texto', async () => {
    const realcar = await carregarRealce('markup');
    const codigo = '<b>**forte**</b> & <script>alert(1)</script>';
    expect(realcar(codigo).map((trecho) => trecho.texto).join('')).toBe(codigo);
  });

  it('gramática sem suporte rejeita (o componente cai no código sem realce)', async () => {
    await expect(carregarRealce('cobol')).rejects.toThrow();
  });

  it('pedir a mesma linguagem duas vezes reaproveita a carga', async () => {
    const primeira = await carregarRealce('typescript');
    const segunda = await carregarRealce('typescript');
    expect(primeira('const a = 1;')).toEqual(segunda('const a = 1;'));
  });
});
