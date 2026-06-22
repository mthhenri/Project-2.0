import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeRecuperadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  descricao: string | null;
  status: AtividadeStatusEnum;
  posicaoAtividadeUsuario: number;
  createdDate: Date;
}
