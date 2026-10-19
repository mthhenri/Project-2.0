import { StatusPropostaIaEnum } from '@project20/shared';
import { IaBloco, IaMensagem } from '../../ia/domain/ia.tipos';

/** O que o contexto precisa saber de uma proposta **agora** (não como era quando a IA a criou). */
export interface SituacaoDaProposta {
  status: StatusPropostaIaEnum;
  resultado: Record<string, unknown> | null;
}

const LIMITE_DO_RESULTADO = 400;

const AVISO_POR_STATUS: Record<StatusPropostaIaEnum, string> = {
  [StatusPropostaIaEnum.PENDENTE]: 'Proposta criada. Nada foi feito ainda: o usuário precisa confirmar no cartão da conversa.',
  [StatusPropostaIaEnum.CONFIRMADA]: 'O usuário CONFIRMOU esta proposta: a ação JÁ FOI FEITA. Não proponha de novo; se precisar de certeza, consulte o estado com as ferramentas de leitura.',
  [StatusPropostaIaEnum.AJUSTADA]: 'O usuário AJUSTOU e confirmou esta proposta: a ação JÁ FOI FEITA com os dados ajustados. Não proponha de novo; consulte o estado se precisar de certeza.',
  [StatusPropostaIaEnum.EXPIRADA]: 'Esta proposta foi RECUSADA ou EXPIROU: NADA foi feito. Só proponha de novo se o usuário pedir.',
  [StatusPropostaIaEnum.DESFEITA]: 'O usuário confirmou esta proposta e depois a DESFEZ: o efeito foi revertido e a ação NÃO vale mais.',
};

function lerPropostaId(conteudo: string): number | null {
  try {
    const lido = JSON.parse(conteudo) as unknown;
    const propostaId = lido && typeof lido === 'object' ? (lido as Record<string, unknown>)['propostaId'] : undefined;
    return typeof propostaId === 'number' && Number.isInteger(propostaId) ? propostaId : null;
  } catch {
    return null;
  }
}

function blocosDeResultado(mensagens: readonly IaMensagem[]): Extract<IaBloco, { tipo: 'resultado_ferramenta' }>[] {
  return mensagens.flatMap((mensagem) =>
    typeof mensagem.conteudo === 'string'
      ? []
      : mensagem.conteudo.filter((bloco): bloco is Extract<IaBloco, { tipo: 'resultado_ferramenta' }> => bloco.tipo === 'resultado_ferramenta'),
  );
}

/** Os ids das propostas que as ferramentas devolveram ao modelo nestas mensagens (sem repetir). */
export function idsDePropostasNoContexto(mensagens: readonly IaMensagem[]): number[] {
  const ids = new Set<number>();
  for (const bloco of blocosDeResultado(mensagens)) {
    const propostaId = lerPropostaId(bloco.conteudo);
    if (propostaId !== null) ids.add(propostaId);
  }
  return [...ids];
}

/**
 * O resultado de uma ferramenta de proposta é gravado como era no turno ("Nada foi feito ainda"). Quando o usuário confirma, recusa ou
 * desfaz no cartão, o contexto seguinte ainda diria isso, e a IA agiria como se a proposta estivesse pendente (P-022). Aqui cada resultado
 * de proposta é reescrito com a situação **atual**; propostas fora do mapa ficam como estavam. Não altera as mensagens recebidas.
 */
export function atualizarPropostasNoContexto(mensagens: readonly IaMensagem[], situacoes: ReadonlyMap<number, SituacaoDaProposta>): IaMensagem[] {
  return mensagens.map((mensagem) => {
    if (typeof mensagem.conteudo === 'string') return mensagem;
    return {
      ...mensagem,
      conteudo: mensagem.conteudo.map((bloco): IaBloco => {
        if (bloco.tipo !== 'resultado_ferramenta') return bloco;
        const propostaId = lerPropostaId(bloco.conteudo);
        const situacao = propostaId === null ? undefined : situacoes.get(propostaId);
        if (propostaId === null || !situacao) return bloco;
        const resultado = situacao.resultado ? JSON.stringify(situacao.resultado) : null;
        return {
          ...bloco,
          conteudo: JSON.stringify({
            propostaId,
            situacao: situacao.status,
            mensagem: AVISO_POR_STATUS[situacao.status],
            ...(resultado && resultado.length <= LIMITE_DO_RESULTADO ? { resultado: situacao.resultado } : {}),
          }),
        };
      }),
    };
  });
}
