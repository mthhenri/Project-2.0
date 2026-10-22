import { ReferenciaMensagemDiretaEnum } from '../../enums/referencia-mensagem-direta.enum';

/** Uma demanda ou atividade que o usuário pode referenciar, para a lista de sugestões do `#`. */
export interface MensagemDiretaReferenciaResumoDto {
  tipo: ReferenciaMensagemDiretaEnum;
  id: number;
  nome: string;
  /** O status (`TipoDemandaStatusEnum` ou `TipoAtividadeStatusEnum`). */
  situacao: string;
  /** O nome da demanda da atividade; `null` quando a referência é uma demanda. */
  demandaNome: string | null;
}
