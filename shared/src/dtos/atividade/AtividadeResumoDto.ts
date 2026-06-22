import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { TagResumoDto } from '../tag/TagResumoDto';

export class AtividadeResumoDto {
  id: number;
  nome: string;
  status: AtividadeStatusEnum;
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
  /** Tags ativas atribuídas à atividade, agregadas na própria listagem. */
  tags: TagResumoDto[];
  createdDate: Date;
}
