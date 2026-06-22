import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeAlteradaDto {
  id: number;
  demandaId: number;
  usuarioId: number;
  nomeUsuario: string;
  nome: string;
  descricao: string | null;
  status: AtividadeStatusEnum;
  createdDate: Date;
}
