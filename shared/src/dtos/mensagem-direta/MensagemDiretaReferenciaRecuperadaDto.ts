import { ReferenciaMensagemDiretaEnum } from '../../enums/referencia-mensagem-direta.enum';

/**
 * O cartão de uma referência **para quem está olhando** (que pode não ser quem escreveu a mensagem). Sem acesso (ou inexistente), `acessivel` é `false`
 * e **nenhum dado** da demanda ou da atividade volta: o cartão aparece bloqueado e o título não vaza.
 */
export interface MensagemDiretaReferenciaRecuperadaDto {
  tipo: ReferenciaMensagemDiretaEnum;
  id: number;
  acessivel: boolean;
  nome: string | null;
  /** O status (`TipoDemandaStatusEnum` ou `TipoAtividadeStatusEnum`). */
  situacao: string | null;
  /** Para onde o clique leva: o projeto da demanda ou da atividade. */
  projetoId: number | null;
  /** Só na atividade: a demanda dela. */
  demandaId: number | null;
  demandaNome: string | null;
}
