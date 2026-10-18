import { EstadoIaEnum } from '@project20/shared';

/** O destino que `urlRetornoSegura` devolve quando não há retorno válido. */
export const DESTINO_SEM_RETORNO = '/ponto';
/** Com a IA no ar o usuário cai no chat do dia. */
export const DESTINO_COM_IA = '/chat';
/** Com a IA desligada, fora do ar ou sem resposta, a tela de Atividades (o fluxo convencional). */
export const DESTINO_SEM_IA = '/atividade';

/**
 * Para onde o login leva. Um retorno válido (o usuário foi mandado ao login por uma rota protegida) sempre vence; sem retorno, o chat
 * quando a IA está no ar e Atividades quando não está (ou quando o estado não pôde ser lido: sem informação, o fluxo convencional).
 */
export function destinoPosLogin(retornoSeguro: string, estadoDaIa: EstadoIaEnum | null): string {
  if (retornoSeguro !== DESTINO_SEM_RETORNO) return retornoSeguro;
  return estadoDaIa === EstadoIaEnum.NO_AR ? DESTINO_COM_IA : DESTINO_SEM_IA;
}
