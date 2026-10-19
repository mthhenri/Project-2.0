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
  if (!('ResizeObserver' in window)) {
    (window as unknown as Record<string, unknown>)['ResizeObserver'] = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
}
