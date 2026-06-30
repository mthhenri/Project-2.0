import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

export class AtividadeCriadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nome: string;
  descricao: string | null;
  status: TipoAtividadeStatusEnum;
  createdDate: Date;
}
