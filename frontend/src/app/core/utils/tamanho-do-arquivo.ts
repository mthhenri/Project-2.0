/** `87654321` → `83,6 MB` (base 1024, uma casa decimal, vírgula do português); abaixo de 1 KB mostra bytes. */
export function formatarTamanhoDoArquivo(bytes: number): string {
  const unidades = ['KB', 'MB', 'GB'];
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes || 0))} B`;
  let valor = bytes / 1024;
  let indice = 0;
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice++;
  }
  return `${valor.toFixed(1).replace('.', ',')} ${unidades[indice]}`;
}
