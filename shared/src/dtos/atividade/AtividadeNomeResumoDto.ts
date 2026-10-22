import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

/** Uma atividade achada pelo nome, com a demanda a que pertence. */
export interface AtividadeNomeResumoDto {
  id: number;
  nome: string;
  status: TipoAtividadeStatusEnum;
  demandaId: number;
  nomeDemanda: string;
  projetoId: number;
}
