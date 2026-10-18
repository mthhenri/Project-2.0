import { AtividadePrioridadeResumoDto } from '../atividade-prioridade/AtividadePrioridadeResumoDto';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeRecuperadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  status: TipoAtividadeStatusEnum;
  prioridade: AtividadePrioridadeResumoDto;
  posicaoAtividadeUsuario: number;
  createdDate: Date;
}
