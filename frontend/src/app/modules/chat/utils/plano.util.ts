import { PlanoAbaEnum } from '@project20/shared';

/** Os dois modos do chat: o de hoje (Perguntas) e o planejamento, com o documento ao lado. */
export enum ModoDoChatEnum {
  PERGUNTAS = 'PERGUNTAS',
  PLANEJAMENTO = 'PLANEJAMENTO',
}

export const ROTULO_ABA_DO_PLANO: Record<PlanoAbaEnum, string> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: 'Descrição técnica',
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: 'Descrição do cliente',
  [PlanoAbaEnum.DOCUMENTACAO]: 'Documentação',
};

/** Parte do espaço (%) que o documento ocupa, com os limites do divisor. */
export const LARGURA_DO_DOCUMENTO = { padrao: 50, minima: 30, maxima: 70, passoDoTeclado: 2 } as const;

/** Mantém a largura do documento entre o mínimo e o máximo; valor ilegível volta ao padrão. */
export function limitarLarguraDoDocumento(percentual: number): number {
  if (!Number.isFinite(percentual)) return LARGURA_DO_DOCUMENTO.padrao;
  return Math.min(LARGURA_DO_DOCUMENTO.maxima, Math.max(LARGURA_DO_DOCUMENTO.minima, Math.round(percentual * 10) / 10));
}

/** O percentual do documento para a posição do ponteiro: o documento fica à direita, então ele ocupa o que sobra depois do ponteiro. */
export function larguraDoDocumentoPeloPonteiro(ponteiroX: number, areaEsquerda: number, areaLargura: number): number {
  if (areaLargura <= 0) return LARGURA_DO_DOCUMENTO.padrao;
  return limitarLarguraDoDocumento(((areaEsquerda + areaLargura - ponteiroX) / areaLargura) * 100);
}
