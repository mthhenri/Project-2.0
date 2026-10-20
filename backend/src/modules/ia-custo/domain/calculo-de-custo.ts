import { IaCustoModeloDto, IaCustoPeriodoDto, IaCustoTotaisDto, IaModeloPrecoDto } from '@project20/shared';

const TOKENS_POR_MILHAO = 1_000_000;

/** Uma soma do repository: o uso de um modelo num período (dia ou mês). */
export interface UsoSomado {
  periodo: string;
  modelo: string;
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCache: number;
}

/** O custo em dólares: cada tipo de token pelo preço do milhão dele. Arredondado em 6 casas para o ruído do ponto flutuante não aparecer. */
export function calcularCustoDolar(uso: Pick<UsoSomado, 'tokensEntrada' | 'tokensSaida' | 'tokensCache'>, preco: IaModeloPrecoDto): number {
  const custo =
    (uso.tokensEntrada * preco.precoEntradaMilhao + uso.tokensSaida * preco.precoSaidaMilhao + uso.tokensCache * preco.precoCacheMilhao) /
    TOKENS_POR_MILHAO;
  return Math.round(custo * 1_000_000) / 1_000_000;
}

/**
 * Uma linha por modelo: os que tiveram uso no recorte, os que têm preço cadastrado e os que a configuração ativa usa (assim o
 * administrador define o preço de um modelo antes de ele ser chamado). Ordem: em uso, depois mais custo/mais chamadas, depois nome.
 */
export function montarModelos(usos: UsoSomado[], precos: IaModeloPrecoDto[], modelosEmUso: string[]): IaCustoModeloDto[] {
  const precoPorModelo = new Map(precos.map((preco) => [preco.modelo, preco]));
  const somaPorModelo = new Map<string, Omit<UsoSomado, 'periodo' | 'modelo'>>();
  for (const uso of usos) {
    const atual = somaPorModelo.get(uso.modelo) ?? { chamadas: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 };
    somaPorModelo.set(uso.modelo, {
      chamadas: atual.chamadas + uso.chamadas,
      tokensEntrada: atual.tokensEntrada + uso.tokensEntrada,
      tokensSaida: atual.tokensSaida + uso.tokensSaida,
      tokensCache: atual.tokensCache + uso.tokensCache,
    });
  }

  const nomes = new Set([...somaPorModelo.keys(), ...precoPorModelo.keys(), ...modelosEmUso]);
  const modelos = [...nomes].map((modelo): IaCustoModeloDto => {
    const soma = somaPorModelo.get(modelo) ?? { chamadas: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 };
    const preco = precoPorModelo.get(modelo) ?? null;
    return { modelo, ...soma, preco, custoDolar: preco ? calcularCustoDolar(soma, preco) : null, emUso: modelosEmUso.includes(modelo) };
  });
  return modelos.sort(
    (primeiro, segundo) =>
      Number(segundo.emUso) - Number(primeiro.emUso) ||
      (segundo.custoDolar ?? 0) - (primeiro.custoDolar ?? 0) ||
      segundo.chamadas - primeiro.chamadas ||
      primeiro.modelo.localeCompare(segundo.modelo),
  );
}

export function somarTotais(modelos: IaCustoModeloDto[]): IaCustoTotaisDto {
  return modelos.reduce<IaCustoTotaisDto>(
    (totais, modelo) => ({
      chamadas: totais.chamadas + modelo.chamadas,
      tokensEntrada: totais.tokensEntrada + modelo.tokensEntrada,
      tokensSaida: totais.tokensSaida + modelo.tokensSaida,
      tokensCache: totais.tokensCache + modelo.tokensCache,
      custoDolar: Math.round((totais.custoDolar + (modelo.custoDolar ?? 0)) * 1_000_000) / 1_000_000,
      modelosSemPreco: totais.modelosSemPreco + (modelo.preco === null && modelo.chamadas > 0 ? 1 : 0),
    }),
    { chamadas: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, custoDolar: 0, modelosSemPreco: 0 },
  );
}

/** O uso ao longo do período: todos os dias do mês (ou todos os meses do ano) aparecem, mesmo sem uso, para o gráfico não ter buracos. */
export function montarPeriodos(usos: UsoSomado[], precos: IaModeloPrecoDto[], todosOsPeriodos: string[]): IaCustoPeriodoDto[] {
  const precoPorModelo = new Map(precos.map((preco) => [preco.modelo, preco]));
  const porPeriodo = new Map<string, IaCustoPeriodoDto>(todosOsPeriodos.map((periodo) => [periodo, { periodo, chamadas: 0, tokens: 0, custoDolar: 0 }]));
  for (const uso of usos) {
    const periodo = porPeriodo.get(uso.periodo);
    if (!periodo) continue;
    const preco = precoPorModelo.get(uso.modelo);
    periodo.chamadas += uso.chamadas;
    periodo.tokens += uso.tokensEntrada + uso.tokensSaida + uso.tokensCache;
    if (preco) periodo.custoDolar = Math.round((periodo.custoDolar + calcularCustoDolar(uso, preco)) * 1_000_000) / 1_000_000;
  }
  return [...porPeriodo.values()];
}

/** Os dias (`yyyy-mm-dd`) de um mês ou os meses (`yyyy-mm`) de um ano, em ordem. */
export function listarPeriodos(ano: number, mes?: number): string[] {
  const doisDigitos = (valor: number) => String(valor).padStart(2, '0');
  if (mes === undefined) return Array.from({ length: 12 }, (_, indice) => `${ano}-${doisDigitos(indice + 1)}`);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return Array.from({ length: ultimoDia }, (_, indice) => `${ano}-${doisDigitos(mes)}-${doisDigitos(indice + 1)}`);
}
