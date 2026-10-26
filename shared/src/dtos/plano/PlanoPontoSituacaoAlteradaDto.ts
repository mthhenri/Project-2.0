import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

export interface PlanoPontoSituacaoAlteradaDto {
  id: number;
  situacao: TipoPlanoPontoSituacaoEnum;
  resolucaoTexto: string | null;
}
