import { MensagemDiretaReferenciaResumoDto, ReferenciaMensagemDto, formatarReferenciaDireta } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Regras puras da service do chat entre colaboradores (task 208). Ficam fora da service para serem testadas sem dublê e para o armazenamento
 * (que defende o próprio documento) e a service (que defende o pedido) não duplicarem a conta.
 */

/**
 * As menções de uma mensagem: sem repetição e só dos dois participantes. Quem não participa não lê a conversa, e um aviso para ele vazaria
 * que a conversa existe e o que ela diz.
 */
export function normalizarMencoes(mencoes: number[] | undefined, participantes: number[]): number[] {
  const unicas = [...new Set(mencoes ?? [])];
  const forasDaConversa = unicas.filter((usuarioId) => !participantes.includes(usuarioId));
  if (forasDaConversa.length > 0) {
    throw new BusinessException('Só é possível mencionar as pessoas da própria conversa');
  }
  return unicas;
}

/** As referências sem repetição, na ordem em que o autor as escreveu. */
export function normalizarReferencias(referencias: ReferenciaMensagemDto[] | undefined): ReferenciaMensagemDto[] {
  const vistas = new Set<string>();
  const unicas: ReferenciaMensagemDto[] = [];
  for (const referencia of referencias ?? []) {
    const chave = formatarReferenciaDireta(referencia);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    unicas.push({ tipo: referencia.tipo, id: referencia.id });
  }
  return unicas;
}

/**
 * A data até onde a pessoa diz ter lido. É a da última mensagem que ela viu, que o servidor gravou; por isso nunca passa do instante atual.
 * Uma data no futuro esconderia as mensagens novas para sempre, e a mais antiga que a gravada é descartada pelo banco (a leitura não recua).
 */
export function limitarLeituraAoAgora(lidaAteDate: string, agora: Date): Date {
  const data = new Date(lidaAteDate);
  if (Number.isNaN(data.getTime())) throw new BusinessException('Data de leitura inválida');
  return data.getTime() > agora.getTime() ? agora : data;
}

/** Datas da busca (`inicio` e `fim`) como `Date`; o período invertido é recusado aqui para a mensagem ser clara. */
export function lerPeriodoDaBusca(inicio: string | undefined, fim: string | undefined): { inicio?: Date; fim?: Date } {
  const periodo = { inicio: inicio ? new Date(inicio) : undefined, fim: fim ? new Date(fim) : undefined };
  for (const data of [periodo.inicio, periodo.fim]) {
    if (data && Number.isNaN(data.getTime())) throw new BusinessException('Período da busca inválido');
  }
  if (periodo.inicio && periodo.fim && periodo.inicio.getTime() > periodo.fim.getTime()) {
    throw new BusinessException('O início do período deve ser anterior ao fim');
  }
  return periodo;
}

/** Quantas sugestões o `#` mostra no máximo. */
export const LIMITE_DE_SUGESTOES_DE_REFERENCIA = 8;

/**
 * As sugestões do `#`: demandas e atividades juntas, no máximo oito. Cada tipo entra com até metade das vagas, e o que sobrar de um tipo é preenchido
 * pelo outro (quem digita pouco de um tipo não fica com a lista meio vazia).
 */
export function combinarSugestoesDeReferencia(
  demandas: MensagemDiretaReferenciaResumoDto[],
  atividades: MensagemDiretaReferenciaResumoDto[],
  limite: number = LIMITE_DE_SUGESTOES_DE_REFERENCIA,
): MensagemDiretaReferenciaResumoDto[] {
  const metade = Math.floor(limite / 2);
  const escolhidas = [...demandas.slice(0, metade), ...atividades.slice(0, metade)];
  const sobras = [...demandas.slice(metade), ...atividades.slice(metade)];
  return [...escolhidas, ...sobras.slice(0, Math.max(0, limite - escolhidas.length))];
}
