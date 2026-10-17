import { HttpException, HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../core/exceptions/business.exception';

export type IaMotivoFalha =
  /** Desligada pelo administrador. */
  | 'DESLIGADA'
  /** Fora do ar, sem chave ou erro do provedor. */
  | 'INDISPONIVEL'
  /** Limite de uso do provedor. */
  | 'LIMITE'
  /** Provedor sem suporte, chave recusada, modelo inexistente. */
  | 'CONFIGURACAO';

/** Falha da IA já traduzida: nunca o erro cru do SDK. Quem chama decide a mensagem ao usuário. */
export class IaException extends HttpException {
  constructor(
    readonly motivo: IaMotivoFalha,
    readonly mensagem: string,
  ) {
    super({ sucesso: false, mensagem, dados: null, erros: [] }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Para quem chama a IA e já tem um contrato HTTP próprio: a falha da IA vira a `BusinessException` de sempre, com a
 * mensagem do motivo (desligada, sem chave, limite...) ou a genérica para qualquer erro desconhecido.
 */
export function traduzirFalhaDeIa(erro: unknown): BusinessException {
  if (erro instanceof IaException) return new BusinessException(erro.mensagem);
  return new BusinessException('Serviço de IA temporariamente indisponível');
}
