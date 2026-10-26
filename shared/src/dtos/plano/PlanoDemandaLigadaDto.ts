import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

export interface PlanoDemandaLigadaDto {
  id: number;
  demandaId: number;
  /** A versão do plano depois de ligar (sobe quando uma aba vazia recebeu o texto da demanda). */
  versao: number;
  /** As abas que começaram com o texto atual da demanda. */
  abasPreenchidas: PlanoAbaEnum[];
}
