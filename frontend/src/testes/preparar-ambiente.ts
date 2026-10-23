// Carregado antes de cada arquivo de teste (angular.json → test.options.setupFiles).
// Preenche o que o jsdom não traz e que os componentes PrimeNG tocam ao renderizar.

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((consulta: string) => ({
      matches: false,
      media: consulta,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
  // O ProseMirror mede o texto com um `Range` para rolar o cursor à vista (task 218); o jsdom não implementa a medição, então ela devolve retângulos vazios.
  if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
  }
  if (!('ResizeObserver' in window)) {
    (window as unknown as Record<string, unknown>)['ResizeObserver'] = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
}
