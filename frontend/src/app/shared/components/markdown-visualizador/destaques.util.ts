/** Um pedaço de texto puro; `destaque` marca o que casou com uma menção (`@Nome`) ou referência (`#Nome`) conhecida. */
export interface PedacoDoTexto {
  valor: string;
  destaque: boolean;
}

/**
 * Parte o texto nos trechos que são exatamente algum dos `destaques` (o nome inteiro, com o `@` ou `#` na frente, no início de uma palavra e sem
 * continuar em letra ou número depois). O mais longo vence quando um nome contém outro. Resultado em texto puro: o template cria os elementos.
 */
export function partirPorDestaques(texto: string, destaques: readonly string[]): PedacoDoTexto[] {
  const ordenados = [...new Set(destaques.filter((destaque) => destaque.length > 1))].sort((a, b) => b.length - a.length);
  if (ordenados.length === 0 || !texto) return [{ valor: texto, destaque: false }];

  const pedacos: PedacoDoTexto[] = [];
  let pendente = '';
  let posicao = 0;
  while (posicao < texto.length) {
    const antes = posicao === 0 ? ' ' : texto[posicao - 1];
    const casou = /[@#]/.test(texto[posicao]) && !/[\p{L}\p{N}_]/u.test(antes)
      ? ordenados.find((destaque) => texto.startsWith(destaque, posicao) && !/[\p{L}\p{N}_]/u.test(texto[posicao + destaque.length] ?? ' '))
      : undefined;
    if (casou) {
      if (pendente) pedacos.push({ valor: pendente, destaque: false });
      pedacos.push({ valor: casou, destaque: true });
      pendente = '';
      posicao += casou.length;
    } else {
      pendente += texto[posicao];
      posicao++;
    }
  }
  if (pendente) pedacos.push({ valor: pendente, destaque: false });
  return pedacos;
}
