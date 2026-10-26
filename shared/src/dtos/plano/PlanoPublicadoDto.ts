import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

export interface PlanoPublicadoDto {
  id: number;
  demandaId: number;
  /** O instante da publicação, que o plano guarda em `publicacaoData`. */
  publicacaoData: string;
  /** As abas que de fato mudaram na demanda (a escolhida que já era igual não conta). */
  abasPublicadas: PlanoAbaEnum[];
  /** Alterações de trecho da IA ainda pendentes: ficaram de fora da publicação, porque não estão no texto do plano. */
  trechosPendentes: number;
}
