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
}

/** Os nomes vêm da listagem da própria atividade (a mesma da tela de Execuções), sempre do usuário do token. `null` sem execução ativa. */
export async function recuperarExecucaoAtivaDetalhada(execucaoService: ExecucaoService, usuarioAtivo: JwtPayload): Promise<ExecucaoAtivaDetalhada | null> {
  const ativa = (await execucaoService.recuperarAtiva(usuarioAtivo)).dados;
  if (!ativa) return null;
  const daAtividade = (await execucaoService.listar({ usuarioId: usuarioAtivo.sub, atividadeId: ativa.atividadeId, allRows: true }, usuarioAtivo)).dados;
  const detalhada = daAtividade?.itens.find((item) => item.id === ativa.id);
  return {
    id: ativa.id,
    atividadeId: ativa.atividadeId,
    descricao: ativa.descricao,
    inicioData: new Date(ativa.inicioData),
    nomeAtividade: detalhada?.nomeAtividade,
    nomeDemanda: detalhada?.nomeDemanda,
    nomeProjeto: detalhada?.nomeProjeto,
  };
}
