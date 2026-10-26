import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

export interface PlanoPontoCriadoDto {
  id: number;
  planoId: number;
  rotulo: string;
  texto: string;
  situacao: TipoPlanoPontoSituacaoEnum;
}
