/** Digitando: input, textarea (inclui o editor de Markdown), select ou campo contenteditable. */
export function focoEmCampo(alvo: EventTarget | null): boolean {
  const elemento = alvo as HTMLElement | null;
  if (!elemento) return false;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName) ||
    elemento.isContentEditable ||
    !!elemento.closest('[contenteditable="true"]')
  );
}

/** Dialog, popover ou overlay do PrimeNG aberto: atalhos de teclado ficam quietos. */
export function haSobreposicaoAberta(): boolean {
  return !!document.querySelector(
    '.p-dialog-mask, .p-popover, .p-select-overlay, .p-multiselect-overlay, .p-datepicker-panel, .p-contextmenu, .p-confirmpopup',
  );
}
