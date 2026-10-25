/**
 * O que separa o texto de uma volta nova do laço de ferramentas do que a IA já escreveu (task 225): um parágrafo em branco. Antes de
 * qualquer texto não há o que separar, e o que já termina em quebra de linha só ganha o que falta para completar o parágrafo.
 */
export function separadorEntreVoltas(textoAteAgora: string): string {
  if (textoAteAgora === '') return '';
  if (textoAteAgora.endsWith('\n\n')) return '';
  if (textoAteAgora.endsWith('\n')) return '\n';
  return '\n\n';
}
