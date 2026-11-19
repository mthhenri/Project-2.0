import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecucaoService } from '../services/execucao.service';

/** A execução ativa do usuário com os nomes da atividade, da demanda e do projeto (a execução ativa sozinha só traz os ids). */
export interface ExecucaoAtivaDetalhada {
    id: number;
    atividadeId: number;
    descricao: string;
    inicioData: Date;
    nomeAtividade?: string;
    nomeDemanda?: string;
    nomeProjeto?: string;
    nomeUsuario?: string;
}

/**
 * Os nomes vêm da mesma consulta da execução ativa (uma leitura só, sem listar as execuções da atividade). Por padrão é a execução do usuário
 * do token; o gestor pode pedir a de outro com `usuarioId` (a `ExecucaoService` recusa o desenvolvedor). `null` sem execução ativa.
 */
export async function recuperarExecucaoAtivaDetalhada(
    execucaoService: ExecucaoService,
    usuarioAtivo: JwtPayload,
    usuarioId: number = usuarioAtivo.sub,
): Promise<ExecucaoAtivaDetalhada | null> {
    const ativa = (await execucaoService.recuperarAtivaDetalhada({ usuarioId }, usuarioAtivo)).dados;
    if (!ativa) return null;
    return {
        id: ativa.id,
        atividadeId: ativa.atividadeId,
        descricao: ativa.descricao,
        inicioData: new Date(ativa.inicioData),
        nomeAtividade: ativa.nomeAtividade,
        nomeDemanda: ativa.nomeDemanda ?? undefined,
        nomeProjeto: ativa.nomeProjeto ?? undefined,
        nomeUsuario: ativa.nomeUsuario ?? undefined,
    };
}
