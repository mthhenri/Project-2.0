import { TipoPropostaIaEnum } from '../enums/tipo-proposta-ia.enum';

/** O inteiro positivo que a proposta guarda numa chave (`undefined` se não houver). */
function idGuardado(dados: Record<string, unknown>, chave: string): number | undefined {
  const valor = dados[chave];
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : undefined;
}

/**
 * Os ids das **outras propostas** de que uma proposta precisa para ser confirmada (task 227): hoje só `CRIAR_DEMANDA`, que pode nascer dentro
 * de um projeto (`projetoPropostaId`) ou de uma demanda de estrutura (`demandaPaiPropostaId`) que outra proposta do mesmo pedido ainda vai criar.
 * O executor exige a proposta referenciada confirmada; o grupo usa esta regra para a mostrar ("depende da N") e para não tentar a dependente
 * quando a referenciada falhou. Quem referencia sempre nasce depois de quem é referenciado, então o id menor vem primeiro.
 */
export function idsDasPropostasDeQueDepende(tipo: TipoPropostaIaEnum, dados: Record<string, unknown>): number[] {
  if (tipo !== TipoPropostaIaEnum.CRIAR_DEMANDA) return [];
  return [idGuardado(dados, 'projetoPropostaId'), idGuardado(dados, 'demandaPaiPropostaId')].filter((id): id is number => id !== undefined);
}
