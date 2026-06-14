import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeResumoDto {
  id: number;
  nome: string;
  status: AtividadeStatusEnum;
  ordemExibicao: number;
  usuarioId: number;
  nomeUsuario: string;
}
