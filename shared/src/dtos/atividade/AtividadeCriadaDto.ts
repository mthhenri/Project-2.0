import { AtividadePrioridadeResumoDto } from '../atividade-prioridade/AtividadePrioridadeResumoDto';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeCriadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nome: string;
  status: TipoAtividadeStatusEnum;
  prioridade: AtividadePrioridadeResumoDto;
  createdDate: Date;
}
