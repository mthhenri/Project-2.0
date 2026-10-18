import { DemandaDoGrafoDto, SugestaoDeConexaoOuLugarDto } from '@project20/shared';

/** Quantas sugestões voltam e quantas outras demandas (com descrição) entram no contexto da análise. */
export const MAXIMO_DE_SUGESTOES_DE_CONEXAO = 5;
export const MAXIMO_DE_DEMANDAS_NO_CONTEXTO = 25;
export const MAXIMO_DE_CARACTERES_DA_DESCRICAO_NO_CONTEXTO = 300;

export interface DemandaParaContexto {
  id: number;
  nome: string;
  paiId: number | null;
  isEstrutural: boolean;
  status: string;
  descricao: string | null;
}

function cortar(texto: string | null): string {
  if (!texto) return 'sem descrição';
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length > MAXIMO_DE_CARACTERES_DA_DESCRICAO_NO_CONTEXTO ? `${limpo.slice(0, MAXIMO_DE_CARACTERES_DA_DESCRICAO_NO_CONTEXTO)}…` : limpo;
}

/** O contexto do projeto para a análise: a demanda alvo por inteiro e uma linha por demanda do projeto (hierarquia, tipo e descrição resumida). */
export function montarContextoDaAnalise(entrada: {
  projeto: string;
  alvo: DemandaParaContexto & { descricaoCliente: string | null; descricaoTecnica: string | null };
  outras: DemandaParaContexto[];
  conexoesDoAlvo: { origemId: number; destinoId: number }[];
}): string {
  const linhas = entrada.outras.map(
    (demanda) => `- #${demanda.id} "${demanda.nome}" (${demanda.isEstrutural ? 'estrutura' : 'trabalho'}, ${demanda.status}, pai: ${demanda.paiId ?? 'nenhum'}): ${cortar(demanda.descricao)}`,
  );
  return [
    `Projeto "${entrada.projeto}". Demanda a analisar: #${entrada.alvo.id} "${entrada.alvo.nome}" (${entrada.alvo.isEstrutural ? 'estrutura' : 'trabalho'}, pai: ${entrada.alvo.paiId ?? 'nenhum'}).`,
    `Descrição do cliente: ${cortar(entrada.alvo.descricaoCliente)}`,
    `Descrição técnica: ${cortar(entrada.alvo.descricaoTecnica)}`,
    entrada.conexoesDoAlvo.length > 0 ? `Conexões que ela já tem: ${entrada.conexoesDoAlvo.map((conexao) => `#${conexao.origemId}→#${conexao.destinoId}`).join(', ')}.` : 'Ela ainda não tem conexões.',
    'Outras demandas do projeto:',
    ...linhas,
  ].join('\n');
}

/** Instruções da análise (nível analítico), somadas ao prompt `CONEXAO_DEMANDA`: sugerir só com fundamento e responder em JSON. */
export function montarInstrucoesDaAnalise(): string {
  return [
    'Analise a demanda e sugira, só quando houver fundamento nas descrições e na estrutura, no máximo cinco itens entre: ligar a demanda a outra (tipo CONEXAO, quando uma depende de ou se relaciona com a outra)',
    'ou mover a demanda para baixo de uma demanda de estrutura que combine melhor (tipo LUGAR).',
    'Use só ids das outras demandas listadas; nunca invente demanda nem sugira ligar a demanda a ela mesma. Cada item explica o motivo em uma frase, apoiada no que está escrito.',
    'Se não houver sugestão boa, devolva uma lista vazia: é uma resposta válida.',
    'Responda somente com um array JSON de objetos {"tipo": "CONEXAO" ou "LUGAR", "demandaRelacionadaId": número, "ehBidirecional": booleano, "motivo": texto}, sem cercas de código nem comentário.',
  ].join(' ');
}

interface SugestaoBruta {
  tipo: unknown;
  demandaRelacionadaId: unknown;
  ehBidirecional?: unknown;
  motivo: unknown;
}

/** Lê a resposta da análise (array JSON, com ou sem cercas); vazio se não der. */
export function interpretarSugestoesDeConexao(texto: string): SugestaoBruta[] {
  const miolo = texto.replace(/```(?:json)?/gi, '').trim();
  const inicio = miolo.indexOf('[');
  const fim = miolo.lastIndexOf(']');
  if (inicio === -1 || fim <= inicio) return [];
  try {
    const lido: unknown = JSON.parse(miolo.slice(inicio, fim + 1));
    return Array.isArray(lido) ? (lido.filter((item) => typeof item === 'object' && item !== null) as SugestaoBruta[]) : [];
  } catch {
    return [];
  }
}

/** Os ids das demandas que estão abaixo de `raizId` na hierarquia (não dá para mover uma demanda para baixo da própria descendente). */
export function descendentesDe(raizId: number, demandas: Pick<DemandaDoGrafoDto, 'id' | 'paiId'>[]): Set<number> {
  const descendentes = new Set<number>();
  let fronteira = [raizId];
  while (fronteira.length > 0) {
    const proximos = demandas.filter((demanda) => demanda.paiId !== null && fronteira.includes(demanda.paiId) && !descendentes.has(demanda.id)).map((demanda) => demanda.id);
    proximos.forEach((id) => descendentes.add(id));
    fronteira = proximos;
  }
  return descendentes;
}

/**
 * Deixa só as sugestões válidas: tipo conhecido, outra demanda do próprio projeto (nunca a própria demanda), motivo de verdade; conexão
 * que já existe, e lugar que já é o atual, que não é uma demanda de estrutura ou que está abaixo da própria demanda, saem. Sem repetidas,
 * no máximo `MAXIMO_DE_SUGESTOES_DE_CONEXAO`.
 */
export function filtrarSugestoes(entrada: {
  brutas: SugestaoBruta[];
  demandaId: number;
  demandas: DemandaDoGrafoDto[];
  conexoesExistentes: { origemId: number; destinoId: number }[];
}): SugestaoDeConexaoOuLugarDto[] {
  const porId = new Map(entrada.demandas.map((demanda) => [demanda.id, demanda]));
  const alvo = porId.get(entrada.demandaId);
  const abaixoDoAlvo = descendentesDe(entrada.demandaId, entrada.demandas);
  const vistas = new Set<string>();
  const validas: SugestaoDeConexaoOuLugarDto[] = [];
  for (const bruta of entrada.brutas) {
    const id = Number(bruta.demandaRelacionadaId);
    const motivo = typeof bruta.motivo === 'string' ? bruta.motivo.trim() : '';
    const relacionada = porId.get(id);
    if ((bruta.tipo !== 'CONEXAO' && bruta.tipo !== 'LUGAR') || !relacionada || id === entrada.demandaId || motivo.length < 3) continue;
    const chave = `${bruta.tipo}:${id}`;
    if (vistas.has(chave)) continue;
    if (bruta.tipo === 'CONEXAO') {
      const jaLigadas = entrada.conexoesExistentes.some((conexao) => (conexao.origemId === entrada.demandaId && conexao.destinoId === id) || (conexao.origemId === id && conexao.destinoId === entrada.demandaId));
      if (jaLigadas) continue;
    } else if (!relacionada.isEstrutural || alvo?.paiId === id || abaixoDoAlvo.has(id)) {
      continue;
    }
    vistas.add(chave);
    validas.push({ tipo: bruta.tipo, demandaRelacionadaId: id, demandaRelacionadaNome: relacionada.nome, ehBidirecional: bruta.tipo === 'CONEXAO' && bruta.ehBidirecional === true, motivo: motivo.slice(0, 300) });
    if (validas.length === MAXIMO_DE_SUGESTOES_DE_CONEXAO) break;
  }
  return validas;
}
