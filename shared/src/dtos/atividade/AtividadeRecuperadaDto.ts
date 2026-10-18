import { AtividadePrioridadeResumoDto } from '../atividade-prioridade/AtividadePrioridadeResumoDto';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class AtividadeRecuperadaDto {
  id: number;
  demandaId: number;
  nomeDemanda: string;
  projetoId: number;
  nomeProjeto: string;
  usuarioId: number;
  nomeUsuario: string;
  /** Tipo do dono da atividade. Define se a descrição da execução é obrigatória. */
  usuarioTipo: TipoUsuarioEnum;
  nome: string;
  status: TipoAtividadeStatusEnum;
  prioridade: AtividadePrioridadeResumoDto;
  posicaoAtividadeUsuario: number;
  createdDate: Date;
}
