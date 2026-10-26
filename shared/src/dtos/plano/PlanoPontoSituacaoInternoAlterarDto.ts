import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

export class PlanoPontoSituacaoInternoAlterarDto {
  planoId: number;
  id: number;
  situacao: TipoPlanoPontoSituacaoEnum;
  resolucaoTexto?: string;
}
