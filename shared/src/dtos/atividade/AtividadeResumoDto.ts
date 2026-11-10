import { AtividadePrioridadeResumoDto } from '../atividade-prioridade/AtividadePrioridadeResumoDto';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';
import { TagResumoDto } from '../tag/TagResumoDto';

export class AtividadeResumoDto {
    id: number;
    nome: string;
    status: TipoAtividadeStatusEnum;
    prioridade: AtividadePrioridadeResumoDto;
    usuarioId: number;
    nomeUsuario: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
    /** Tipo do dono da atividade. Define se a descrição da execução é obrigatória. */
    usuarioTipo: TipoUsuarioEnum;
    demandaId: number;
    nomeDemanda: string;
    demandaTemDescricaoCliente: boolean;
    demandaTemDescricaoTecnica: boolean;
    demandaTemDocumentacao: boolean;
    projetoId: number;
    nomeProjeto: string;
    totalMinutosExecutados: number;
    /** Quantas execuções a atividade já teve (as em andamento incluídas). */
    totalExecucoes: number;
    /** Execução em andamento nesta atividade (de qualquer usuário), ou null. */
    execucaoAtivaId: number | null;
    /** Descrição da execução em andamento, para revisão ao encerrar. */
    execucaoAtivaDescricao: string | null;
    /** Quando a execução em andamento começou (alimenta o cronômetro do cartão), ou null. */
    execucaoAtivaInicioData: Date | null;
    /** Tags ativas atribuídas à atividade, agregadas na própria listagem. */
    tags: TagResumoDto[];
    createdDate: Date;
}
