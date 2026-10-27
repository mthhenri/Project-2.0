import { NivelIaEnum } from '../../enums/nivel-ia.enum';

/**
 * Uma chamada à IA feita **fora da conversa** (por exemplo, o "alterar trecho" da tela de Documentações, task 260) para entrar na conta da aba
 * Custos. Os custos saem das mensagens do chat (task 202); esta chamada vira uma mensagem de uso (`ContextoChatEnum.USO_DE_IA`) que só carrega o
 * modelo e os tokens e nunca aparece numa conversa.
 */
export class IaUsoRegistrarDto {
  usuarioId: number;
  /** Do que foi a chamada, em poucas palavras (fica no texto da mensagem de uso). */
  descricao: string;
  nivel: NivelIaEnum;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCache: number;
  demandaId?: number;
}
