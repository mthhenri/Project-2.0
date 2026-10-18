/** O que a redação das descrições da demanda precisa saber. */
export interface DadosDaRedacaoDaDemanda {
  demanda: string;
  projeto: string;
  /** Há relato do cliente / relato técnico para redigir (o que não tem relato não é redigido). */
  querCliente: boolean;
  querTecnica: boolean;
  /** A descrição que a demanda já tem (para incorporar, nunca perder), ou `null`. */
  descricaoClienteAtual: string | null;
  descricaoTecnicaAtual: string | null;
}

/**
 * Instruções da redação (nível analítico), somadas ao prompt `ENTREVISTA_DEMANDA`: Markdown, só o que está no relato, sem inventar o
 * que o cliente pediu, e a resposta como um objeto JSON com `descricaoCliente` e `descricaoTecnica`.
 */
export function montarInstrucoesDeRedacaoDaDemanda(dados: DadosDaRedacaoDaDemanda): string {
  const campos = [dados.querCliente ? '"descricaoCliente"' : null, dados.querTecnica ? '"descricaoTecnica"' : null].filter((campo) => campo !== null).join(' e ');
  return [
    `Contexto: demanda "${dados.demanda}", projeto "${dados.projeto}".`,
    'Redija a(s) descrição(ões) em Markdown (parágrafos curtos, listas quando ajudar), usando só o que está no relato do gestor. Nunca invente o que o cliente pediu nem o que será feito.',
    'Texto do cliente: na voz do pedido do cliente, claro e sem jargão. Texto técnico: o que será feito, objetivo e verificável.',
    dados.descricaoClienteAtual ? `A descrição do cliente que já existe, para incorporar sem perder nada: ${dados.descricaoClienteAtual}` : '',
    dados.descricaoTecnicaAtual ? `A descrição técnica que já existe, para incorporar sem perder nada: ${dados.descricaoTecnicaAtual}` : '',
    `Responda somente com um objeto JSON com ${campos}, cada um uma string em Markdown; sem cercas de código nem comentário.`,
  ]
    .filter((linha) => linha !== '')
    .join(' ');
}

export interface DescricoesRedigidas {
  descricaoCliente?: string;
  descricaoTecnica?: string;
}

/** Lê a resposta da redação (um objeto JSON, com ou sem cercas) e devolve só os campos pedidos e não vazios; `null` se não der. */
export function interpretarRedacaoDaDemanda(texto: string, quer: { cliente: boolean; tecnica: boolean }): DescricoesRedigidas | null {
  const miolo = texto.replace(/```(?:json)?/gi, '').trim();
  const inicio = miolo.indexOf('{');
  const fim = miolo.lastIndexOf('}');
  if (inicio === -1 || fim <= inicio) return null;
  try {
    const lido = JSON.parse(miolo.slice(inicio, fim + 1)) as Record<string, unknown>;
    const resultado: DescricoesRedigidas = {};
    const cliente = typeof lido['descricaoCliente'] === 'string' ? lido['descricaoCliente'].trim() : '';
    const tecnica = typeof lido['descricaoTecnica'] === 'string' ? lido['descricaoTecnica'].trim() : '';
    if (quer.cliente && cliente) resultado.descricaoCliente = cliente;
    if (quer.tecnica && tecnica) resultado.descricaoTecnica = tecnica;
    return resultado.descricaoCliente || resultado.descricaoTecnica ? resultado : null;
  } catch {
    return null;
  }
}
