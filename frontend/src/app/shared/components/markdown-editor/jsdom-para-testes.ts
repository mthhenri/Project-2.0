import { JSDOM } from 'jsdom';

/**
 * Instala um DOM de mentira (jsdom) nas globais, só para os testes de ida e volta do editor formatado rodarem no
 * Node. Não é importado pela aplicação.
 */
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const globais = globalThis as Record<string, unknown>;
const janela = dom.window as unknown as Record<string, unknown>;

const NOMES = [
  'window', 'document', 'Node', 'Element', 'HTMLElement', 'Range', 'Selection', 'MutationObserver', 'DOMParser',
  'getComputedStyle', 'navigator', 'Text', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'DocumentFragment',
  'HTMLInputElement', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'requestAnimationFrame',
  'cancelAnimationFrame',
];

for (const nome of NOMES) {
  const bruto = janela[nome];
  const valor = typeof bruto === 'function' && /^[a-z]/.test(nome) ? (bruto as (...args: unknown[]) => unknown).bind(dom.window) : bruto;
  Object.defineProperty(globais, nome, { value: valor, configurable: true, writable: true });
}
