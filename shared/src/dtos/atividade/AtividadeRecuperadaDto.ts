import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeRecuperadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  descricao: string | null;
  status: TipoAtividadeStatusEnum;
  posicaoAtividadeUsuario: number;
  createdDate: Date;
}
