import { IaException } from './ia.exception';

/**
 * Erro do SDK de um provedor → exceção do projeto, pelo status HTTP (os três SDKs expõem `status`), sem depender das
 * classes de nenhum deles. Falha sem status (rede, tempo esgotado) é indisponibilidade.
 */
export function traduzirErroDeProvedor(erro: unknown): IaException {
  if (erro instanceof IaException) return erro;
  const status = (erro as { status?: number } | null)?.status;
  if (status === 429) return new IaException('LIMITE', 'Limite de uso da IA atingido');
  if (status === 401 || status === 403 || status === 404) {
    return new IaException('CONFIGURACAO', 'Configuração da IA inválida (chave ou modelo recusados pelo provedor)');
  }
  return new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');
}
