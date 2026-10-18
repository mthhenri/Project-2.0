/** Quantas sugestões voltam e o tamanho máximo de cada uma (cabem num botão). */
export const MAXIMO_DE_SUGESTOES = 4;
export const MAXIMO_DE_CARACTERES_DA_SUGESTAO = 60;

/** Instrução da chamada curta que sugere as próximas mensagens do usuário. */
export const INSTRUCOES_DE_SUGESTOES =
  'Sugira de 2 a 4 mensagens curtas (até 7 palavras cada) que o usuário poderia enviar agora, como respostas ou próximos passos naturais da conversa, ' +
  'em português, em primeira pessoa e sem ponto final. Não repita o que ele já disse e não invente fatos. Responda somente com um array JSON de textos, por exemplo ["Começar pela primeira", "Criar uma atividade"].';

/** Lê a resposta do modelo (um array JSON, com ou sem cercas de código) e devolve só sugestões válidas, únicas e no tamanho; vazio se não der. */
export function interpretarSugestoes(textoDoModelo: string): string[] {
  const miolo = textoDoModelo.replace(/```(?:json)?/gi, '').trim();
  const inicio = miolo.indexOf('[');
  const fim = miolo.lastIndexOf(']');
  if (inicio === -1 || fim <= inicio) return [];
  try {
    const lido: unknown = JSON.parse(miolo.slice(inicio, fim + 1));
    if (!Array.isArray(lido)) return [];
    const vistas = new Set<string>();
    for (const item of lido) {
      if (typeof item !== 'string') continue;
      const limpa = item.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
      if (limpa.length >= 2 && limpa.length <= MAXIMO_DE_CARACTERES_DA_SUGESTAO) vistas.add(limpa);
      if (vistas.size === MAXIMO_DE_SUGESTOES) break;
    }
    return [...vistas];
  } catch {
    return [];
  }
}
