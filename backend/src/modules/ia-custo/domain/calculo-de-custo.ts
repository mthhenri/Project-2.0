import { IaCustoModeloDto, IaCustoPeriodoDto, IaCustoTotaisDto, IaModeloPrecoDto, NivelIaEnum } from '@project20/shared';
import { TokensSomados } from '../../chat/domain/chat-consultas';

const TOKENS_POR_MILHAO = 1_000_000;

/**
 * A mensagem guarda o modelo que o provedor devolveu, e para um alias ele devolve o id datado (`claude-haiku-5-5-20261015` para
 * `claude-haiku-5-5`). O administrador precifica o nome que está na configuração, então o uso de um id datado conta no nome conhecido a que
 * ele só acrescenta `-` e uma data (`AAAAMMDD` da Anthropic ou `AAAA-MM-DD` da OpenAI; sem exigir a data, `claude-opus-5-5` cairia em `claude-opus-5`). Modelo que não casa com
 * nenhum nome conhecido fica como veio. Linhas que passam a ter o mesmo período e modelo são somadas.
 */
export function agruparPeloNomeConhecido(usos: TokensSomados[], nomesConhecidos: string[]): TokensSomados[] {
  const comDataDoProvedor = (modelo: string, nome: string): boolean => modelo.startsWith(`${nome}-`) && /^(\d{8}|\d{4}-\d{2}-\d{2})$/.test(modelo.slice(nome.length + 1));
  const nomeConhecido = (modelo: string): string => nomesConhecidos.find((nome) => nome === modelo || comDataDoProvedor(modelo, nome)) ?? modelo;

  const somados = new Map<string, TokensSomados>();
  for (const uso of usos) {
    const modelo = nomeConhecido(uso.modelo);
    const chave = `${uso.periodo}|${modelo}`;
    const atual = somados.get(chave);
    somados.set(chave, {
      periodo: uso.periodo,
      modelo,
      mensagens: (atual?.mensagens ?? 0) + uso.mensagens,
      tokensEntrada: (atual?.tokensEntrada ?? 0) + uso.tokensEntrada,
      tokensSaida: (atual?.tokensSaida ?? 0) + uso.tokensSaida,
      tokensCache: (atual?.tokensCache ?? 0) + uso.tokensCache,
    });
  }
  return [...somados.values()];
}

/** O custo em dólares: cada tipo de token pelo preço do milhão dele. Arredondado em 6 casas para o ruído do ponto flutuante não aparecer. */
export function calcularCustoDolar(uso: Pick<TokensSomados, 'tokensEntrada' | 'tokensSaida' | 'tokensCache'>, preco: IaModeloPrecoDto): number {
  const custo =
    (uso.tokensEntrada * preco.precoEntradaMilhao + uso.tokensSaida * preco.precoSaidaMilhao + uso.tokensCache * preco.precoCacheMilhao) /
    TOKENS_POR_MILHAO;
  return Math.round(custo * 1_000_000) / 1_000_000;
}

/**
 * Uma linha por modelo: os que tiveram uso no recorte, os que têm preço cadastrado e os que a configuração ativa usa (assim o
 * administrador define o preço de um modelo antes de ele ser chamado). Ordem: em uso, depois mais custo/mais mensagens, depois nome.
 */
export function montarModelos(usos: TokensSomados[], precos: IaModeloPrecoDto[], modelosPorNivel: Partial<Record<NivelIaEnum, string>>): IaCustoModeloDto[] {
  const modelosEmUso = Object.values(modelosPorNivel);
  const precoPorModelo = new Map(precos.map((preco) => [preco.modelo, preco]));
  const somaPorModelo = new Map<string, Omit<TokensSomados, 'periodo' | 'modelo'>>();
  for (const uso of usos) {
    const atual = somaPorModelo.get(uso.modelo) ?? { mensagens: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 };
    somaPorModelo.set(uso.modelo, {
      mensagens: atual.mensagens + uso.mensagens,
      tokensEntrada: atual.tokensEntrada + uso.tokensEntrada,
      tokensSaida: atual.tokensSaida + uso.tokensSaida,
      tokensCache: atual.tokensCache + uso.tokensCache,
    });
  }

  const nomes = new Set([...somaPorModelo.keys(), ...precoPorModelo.keys(), ...modelosEmUso]);
  const modelos = [...nomes].map((modelo): IaCustoModeloDto => {
    const soma = somaPorModelo.get(modelo) ?? { mensagens: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 };
    const preco = precoPorModelo.get(modelo) ?? null;
    return {
      modelo,
      ...soma,
      preco,
      custoDolar: preco ? calcularCustoDolar(soma, preco) : null,
      emUso: modelosEmUso.includes(modelo),
      niveis: Object.values(NivelIaEnum).filter((nivel) => modelosPorNivel[nivel] === modelo),
    };
  });
  return modelos.sort(
    (primeiro, segundo) =>
      Number(segundo.emUso) - Number(primeiro.emUso) ||
      (segundo.custoDolar ?? 0) - (primeiro.custoDolar ?? 0) ||
      segundo.mensagens - primeiro.mensagens ||
      primeiro.modelo.localeCompare(segundo.modelo),
  );
}

export function somarTotais(modelos: IaCustoModeloDto[]): IaCustoTotaisDto {
  return modelos.reduce<IaCustoTotaisDto>(
    (totais, modelo) => ({
      mensagens: totais.mensagens + modelo.mensagens,
      tokensEntrada: totais.tokensEntrada + modelo.tokensEntrada,
      tokensSaida: totais.tokensSaida + modelo.tokensSaida,
      tokensCache: totais.tokensCache + modelo.tokensCache,
      custoDolar: Math.round((totais.custoDolar + (modelo.custoDolar ?? 0)) * 1_000_000) / 1_000_000,
      modelosSemPreco: totais.modelosSemPreco + (modelo.preco === null && modelo.mensagens > 0 ? 1 : 0),
    }),
    { mensagens: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, custoDolar: 0, modelosSemPreco: 0 },
  );
}

/** O uso ao longo do período: todos os dias do mês (ou todos os meses do ano) aparecem, mesmo sem uso, para o gráfico não ter buracos. */
export function montarPeriodos(usos: TokensSomados[], precos: IaModeloPrecoDto[], todosOsPeriodos: string[]): IaCustoPeriodoDto[] {
  const precoPorModelo = new Map(precos.map((preco) => [preco.modelo, preco]));
  const porPeriodo = new Map<string, IaCustoPeriodoDto>(todosOsPeriodos.map((periodo) => [periodo, { periodo, mensagens: 0, tokens: 0, custoDolar: 0, modelos: [] }]));
  for (const uso of usos) {
    const periodo = porPeriodo.get(uso.periodo);
    if (!periodo) continue;
    const preco = precoPorModelo.get(uso.modelo);
    const tokens = uso.tokensEntrada + uso.tokensSaida + uso.tokensCache;
    const custoDolar = preco ? calcularCustoDolar(uso, preco) : 0;
    periodo.mensagens += uso.mensagens;
    periodo.tokens += tokens;
    periodo.custoDolar = Math.round((periodo.custoDolar + custoDolar) * 1_000_000) / 1_000_000;
    periodo.modelos.push({ modelo: uso.modelo, mensagens: uso.mensagens, tokens, custoDolar });
  }
  for (const periodo of porPeriodo.values()) periodo.modelos.sort((primeiro, segundo) => primeiro.modelo.localeCompare(segundo.modelo));
  return [...porPeriodo.values()];
}

/** Os dias (`yyyy-mm-dd`) de um mês ou os meses (`yyyy-mm`) de um ano, em ordem. */
export function listarPeriodos(ano: number, mes?: number): string[] {
  const doisDigitos = (valor: number) => String(valor).padStart(2, '0');
  if (mes === undefined) return Array.from({ length: 12 }, (_, indice) => `${ano}-${doisDigitos(indice + 1)}`);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return Array.from({ length: ultimoDia }, (_, indice) => `${ano}-${doisDigitos(mes)}-${doisDigitos(indice + 1)}`);
}
