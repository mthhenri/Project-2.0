import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeCriadaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nome: string;
  descricao: string | null;
  status: AtividadeStatusEnum;
  createdDate: Date;
}
