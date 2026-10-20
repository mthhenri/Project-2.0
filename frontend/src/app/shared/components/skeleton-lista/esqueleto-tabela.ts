/** Uma coluna da tabela real: o rótulo do `th` (vazio quando a coluna não tem rótulo visível) e a largura relativa dela. */
export interface ColunaDoEsqueleto {
  rotulo: string;
  /** Largura medida na tabela real, em px num desktop de 1366: só a proporção importa. */
  peso: number;
}

/** O que `app-skeleton-lista variante="tabela"` recebe para imitar a tabela real: `cabecalhos` e `larguras`. */
export interface EsqueletoDeTabela {
  cabecalhos: readonly string[];
  larguras: string;
}

/** Monta os rótulos e o `grid-template-columns` proporcional ao peso de cada coluna (`minmax(0, <peso>fr)`, para nada estourar). */
export function montarEsqueletoDeTabela(colunas: readonly ColunaDoEsqueleto[]): EsqueletoDeTabela {
  return {
    cabecalhos: colunas.map((coluna) => coluna.rotulo),
    larguras: colunas.map((coluna) => `minmax(0, ${coluna.peso}fr)`).join(' '),
  };
}
