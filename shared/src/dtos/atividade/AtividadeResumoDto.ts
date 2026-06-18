import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeResumoDto {
  id: number;
  nome: string;
  status: AtividadeStatusEnum;
  ordemExibicao: number;
  usuarioId: number;
  nomeUsuario: string;
  demandaId: number;
  nomeDemanda: string;
  demandaTemDescricaoCliente: boolean;
  demandaTemDescricaoTecnica: boolean;
  demandaTemDocumentacao: boolean;
  projetoId: number;
  nomeProjeto: string;
  createdDate: Date;
}
