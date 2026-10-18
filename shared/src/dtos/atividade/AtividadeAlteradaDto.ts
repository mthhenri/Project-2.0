import { AtividadePrioridadeResumoDto } from '../atividade-prioridade/AtividadePrioridadeResumoDto';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeAlteradaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  status: TipoAtividadeStatusEnum;
  prioridade: AtividadePrioridadeResumoDto;
  createdDate: Date;
}
