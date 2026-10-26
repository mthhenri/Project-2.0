import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

export interface PlanoPontoResumoDto {
  id: number;
  planoId: number;
  rotulo: string;
  texto: string;
  situacao: TipoPlanoPontoSituacaoEnum;
  /** A resposta, o motivo de dispensar ou a decisão; `null` enquanto está em aberto. */
  resolucaoTexto: string | null;
  createdDate: string;
  updatedDate: string;
}
