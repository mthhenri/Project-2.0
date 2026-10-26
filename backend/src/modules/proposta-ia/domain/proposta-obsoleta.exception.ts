import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * O executor recusou a proposta porque o estado em que ela se baseava mudou (a alteração de trecho do plano, quando o trecho antigo não está mais
 * no texto). Diferente de uma falha: a proposta **expira** em vez de voltar a pendente, pois confirmar de novo nunca vai servir.
 */
export class PropostaObsoletaException extends BusinessException {}
