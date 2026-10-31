/** Só letras, dígitos e hífen: o nome vai no cabeçalho `Content-Disposition` e vira arquivo em qualquer sistema. */
function paraNomeDeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * O nome do CSV do relatório de execuções (task 291): `<código do projeto>-relatorio-<AAAA-MM>.csv`, por exemplo `dev-agenda-relatorio-2026-10.csv`.
 * O mês é o do período; se o período atravessa meses, vira `<AAAA-MM do início>-a-<AAAA-MM do fim>`. Datas em `AAAA-MM-DD`.
 */
export function nomeDoArquivoDoRelatorio(codigoProjeto: string, dataInicio: string, dataFim: string): string {
  const codigo = paraNomeDeArquivo(codigoProjeto) || 'projeto';
  const mesInicio = dataInicio.slice(0, 7);
  const mesFim = dataFim.slice(0, 7);
  const periodo = mesInicio === mesFim ? mesInicio : `${mesInicio}-a-${mesFim}`;
  return `${codigo}-relatorio-${periodo}.csv`;
}
