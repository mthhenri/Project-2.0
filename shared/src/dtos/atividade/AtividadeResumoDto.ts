import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';

export class AtividadeResumoDto {
  id: number;
  nome: string;
  status: AtividadeStatusEnum;
  ordemExibicao: number;
  usuarioId: number;
  nomeUsuario: string;
  /** Tipo do dono da atividade. Define se a descrição da execução é obrigatória. */
  usuarioTipo: UsuarioTipoEnum;
  demandaId: number;
  nomeDemanda: string;
  demandaTemDescricaoCliente: boolean;
  demandaTemDescricaoTecnica: boolean;
  demandaTemDocumentacao: boolean;
  projetoId: number;
  nomeProjeto: string;
  totalMinutosExecutados: number;
  /** Execução em andamento nesta atividade (de qualquer usuário), ou null. */
  execucaoAtivaId: number | null;
  /** Descrição da execução em andamento, para revisão ao encerrar. */
  execucaoAtivaDescricao: string | null;
  createdDate: Date;
}
