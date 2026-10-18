import { Injectable } from '@nestjs/common';
import { PropostaIniciarExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { ExecucaoService } from '../services/execucao.service';

/** Descrição usada na execução pausada para dar lugar à nova, quando ela não tinha descrição provisória. */
export const DESCRICAO_PAUSA_PARA_INICIAR_OUTRA = 'Pausada para iniciar outra atividade';

/**
 * Executor da proposta `INICIAR_EXECUCAO`: **pausa antes** a execução ativa do usuário (se houver) e inicia a nova, tudo pela
 * `ExecucaoService` com o usuário do token (valem o dono da atividade, o status executável e a regra de uma execução ativa). Se
 * iniciar falhar depois da pausa, reabre a anterior. Desfazer exclui a execução recém-iniciada (só enquanto está em andamento) e
 * reabre a que foi pausada.
 */
@Injectable()
export class IniciarExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.INICIAR_EXECUCAO;

  constructor(private readonly execucaoService: ExecucaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
    const anterior = (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados;

    if (anterior) {
      if (anterior.atividadeId === entrada.atividadeId) throw new BusinessException('Esta atividade já está em execução');
      await this.execucaoService.encerrar({ id: anterior.id, descricao: anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA }, usuarioAtivo);
    }

    try {
      const iniciada = (await this.execucaoService.iniciar({ atividadeId: entrada.atividadeId, descricao: entrada.descricao }, usuarioAtivo)).dados;
      return {
        execucaoId: iniciada?.id,
        atividadeId: entrada.atividadeId,
        ...(anterior ? { pausouExecucaoId: anterior.id, pausouDescricao: anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA } : {}),
      };
    } catch (erro) {
      if (anterior) await this.reabrir(anterior.id, anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA, usuarioAtivo).catch(() => undefined);
      throw erro;
    }
  }

  /** Obsoleta quando a atividade já está em execução (o usuário a iniciou à mão). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
    return (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados?.atividadeId === entrada.atividadeId;
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const execucaoId = Number(resultado['execucaoId']);
    if (!Number.isInteger(execucaoId)) throw new BusinessException('Não há execução a desfazer nesta proposta');
    const iniciada = (await this.execucaoService.recuperar({ id: execucaoId }, usuarioAtivo)).dados;
    if (iniciada?.fimData) throw new BusinessException('A execução já foi encerrada: não dá para desfazer o início');

    await this.execucaoService.excluir({ id: execucaoId }, usuarioAtivo);
    const pausadaId = Number(resultado['pausouExecucaoId']);
    if (Number.isInteger(pausadaId)) {
      await this.reabrir(pausadaId, String(resultado['pausouDescricao'] ?? DESCRICAO_PAUSA_PARA_INICIAR_OUTRA), usuarioAtivo);
    }
  }

  /** Reabre uma execução encerrada (fim nulo), desde que o usuário não tenha outra em andamento. */
  private async reabrir(execucaoId: number, descricao: string, usuarioAtivo: JwtPayload): Promise<void> {
    if ((await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados) {
      throw new BusinessException('Há outra execução em andamento: a anterior não pôde ser reaberta');
    }
    await this.execucaoService.alterar({ id: execucaoId, descricao, fimData: null }, usuarioAtivo);
  }
}
