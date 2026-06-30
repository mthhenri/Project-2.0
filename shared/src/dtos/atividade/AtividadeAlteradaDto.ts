import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeAlteradaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  descricao: string | null;
  status: TipoAtividadeStatusEnum;
  createdDate: Date;
}
