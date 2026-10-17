import { StatusPropostaIaEnum } from '../../enums/status-proposta-ia.enum';
import { TipoPropostaIaEnum } from '../../enums/tipo-proposta-ia.enum';

/** Uma proposta da IA: o que ela quer fazer (`dados`), em que situação está e, depois de confirmada, o que foi feito (`resultado`). */
export interface PropostaIaResumoDto {
  id: number;
  usuarioId: number;
  tipo: TipoPropostaIaEnum;
  status: StatusPropostaIaEnum;
  dados: Record<string, unknown>;
  /** Ids do que foi criado ou alterado; `null` enquanto não foi executada. */
  resultado: Record<string, unknown> | null;
  resolucaoData: Date | null;
  createdDate: Date;
}
