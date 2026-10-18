import { formatarDuracao } from '../../checkin/domain/contexto-do-checkin';

export interface DadosDaRedacao {
  atividade: string;
  demanda: string;
  minutos: number;
  duracaoRecomendadaMinutos: number;
  rigorProporcional: boolean;
}

/** Marca que a redação devolve quando o relato não tem trabalho nenhum (só almoço, pausa, conversa): nada a descrever. */
export const SEM_TRABALHO = 'NENHUM_TRABALHO';

/**
 * Instruções da chamada de redação (nível padrão), somadas ao prompt `DESCRICAO_EXECUCAO`. Com o rigor proporcional ligado, uma
 * execução acima da duração recomendada pede uma descrição mais completa (o que foi feito, por partes) e uma dentro dela, curta.
 */
export function montarInstrucoesDeRedacao(dados: DadosDaRedacao): string {
  const longa = dados.rigorProporcional && dados.minutos > dados.duracaoRecomendadaMinutos;
  return [
    `Contexto: atividade "${dados.atividade}", demanda "${dados.demanda}", execução de ${formatarDuracao(dados.minutos)}.`,
    longa
      ? `A execução passou da duração recomendada (${formatarDuracao(dados.duracaoRecomendadaMinutos)}): escreva uma descrição mais completa, de dois a quatro períodos curtos ou itens, cobrindo o que foi feito em cada frente do relato.`
      : 'Escreva uma descrição curta: uma ou duas frases.',
    'Use só o que está no relato; não invente nada. Terceira pessoa, sem "eu", sem gírias, tempo verbal no passado ou substantivos de ação.',
    `Descreva só trabalho: se o relato for só almoço, pausa pessoal ou conversa sem trabalho, responda exatamente ${SEM_TRABALHO}.`,
    'Não use aspas nem crases. Responda somente com o texto da descrição, sem título nem comentário.',
  ].join(' ');
}

/** O que a redação devolve, pronto para a execução: sem os caracteres que as descrições proíbem, sem aspas de enfeite e numa só peça. */
export function limparDescricaoRedigida(texto: string): string {
  return texto
    .replace(/['"`~^\\´“”‘’]/g, '')
    .replace(/^\s*(?:descri[cç][aã]o\s*:\s*)/i, '')
    .trim();
}
