import { Injectable } from '@nestjs/common';
import { PropostaIniciarExecucaoDadosDto, TipoAtividadeStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { ExecucaoService } from '../services/execucao.service';

/** Descrição usada na execução pausada para dar lugar à nova, quando ela não tinha descrição provisória. */
export const DESCRICAO_PAUSA_PARA_INICIAR_OUTRA = 'Pausada para iniciar outra atividade';

/**
 * Executor da proposta `INICIAR_EXECUCAO`: **pausa antes** a execução ativa do dono da atividade (se houver; o gestor age por ele) e inicia a nova, tudo pela
 * `ExecucaoService` com o usuário do token (valem o dono da atividade, o status executável e a regra de uma execução ativa). Se
 * iniciar falhar depois da pausa, reabre a anterior. Quando o usuário escolheu mudar o status da atividade (`novoStatus`), muda-o
 * antes de iniciar e o devolve se iniciar falhar. Desfazer exclui a execução recém-iniciada (só enquanto está em andamento), reabre a
 * que foi pausada e devolve o status.
 */
@Injectable()
export class IniciarExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.INICIAR_EXECUCAO;

  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly atividadeService: AtividadeService,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
    // A execução é do DONO da atividade (o gestor age por ele): é a ativa dele que pausa antes e que a regra "uma por usuário" olha.
    const donoId = await this.donoDaAtividade(entrada.atividadeId, usuarioAtivo);
    const anterior = (await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: donoId }, usuarioAtivo)).dados;

    if (anterior) {
      if (anterior.atividadeId === entrada.atividadeId) throw new BusinessException('Esta atividade já está em execução');
      await this.execucaoService.encerrar({ id: anterior.id, descricao: anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA }, usuarioAtivo);
    }

    const statusAnterior = entrada.novoStatus ? entrada.statusAnterior : undefined;
    try {
      if (entrada.novoStatus && statusAnterior) await this.atividadeService.alterar({ id: entrada.atividadeId, status: entrada.novoStatus }, usuarioAtivo);
      const iniciada = (await this.execucaoService.iniciar({ atividadeId: entrada.atividadeId, descricao: entrada.descricao }, usuarioAtivo)).dados;
      return {
        execucaoId: iniciada?.id,
        atividadeId: entrada.atividadeId,
        donoId,
        ...(statusAnterior ? { statusAnterior } : {}),
        ...(anterior ? { pausouExecucaoId: anterior.id, pausouDescricao: anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA } : {}),
      };
    } catch (erro) {
      if (statusAnterior) await this.restaurarStatus(entrada.atividadeId, statusAnterior, usuarioAtivo).catch(() => undefined);
      if (anterior) await this.reabrir(anterior.id, anterior.descricao.trim() || DESCRICAO_PAUSA_PARA_INICIAR_OUTRA, donoId, usuarioAtivo).catch(() => undefined);
      throw erro;
    }
  }

  /** Obsoleta quando a atividade já está em execução (o dono a iniciou à mão, ou o gestor por ele). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaIniciarExecucaoDadosDto, dados);
    const donoId = await this.donoDaAtividade(entrada.atividadeId, usuarioAtivo);
    return (await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: donoId }, usuarioAtivo)).dados?.atividadeId === entrada.atividadeId;
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const execucaoId = Number(resultado['execucaoId']);
    if (!Number.isInteger(execucaoId)) throw new BusinessException('Não há execução a desfazer nesta proposta');
    const iniciada = (await this.execucaoService.recuperar({ id: execucaoId }, usuarioAtivo)).dados;
    if (iniciada?.fimData) throw new BusinessException('A execução já foi encerrada: não dá para desfazer o início');

    await this.execucaoService.excluir({ id: execucaoId }, usuarioAtivo);
    const statusAnterior = resultado['statusAnterior'] as TipoAtividadeStatusEnum | undefined;
    const atividadeId = Number(resultado['atividadeId']);
    if (statusAnterior && Number.isInteger(atividadeId)) await this.restaurarStatus(atividadeId, statusAnterior, usuarioAtivo);
    const pausadaId = Number(resultado['pausouExecucaoId']);
    if (Number.isInteger(pausadaId)) {
      const donoId = Number.isInteger(Number(resultado['donoId'])) ? Number(resultado['donoId']) : usuarioAtivo.sub;
      await this.reabrir(pausadaId, String(resultado['pausouDescricao'] ?? DESCRICAO_PAUSA_PARA_INICIAR_OUTRA), donoId, usuarioAtivo);
    }
  }

  private async restaurarStatus(atividadeId: number, status: TipoAtividadeStatusEnum, usuarioAtivo: JwtPayload): Promise<void> {
    await this.atividadeService.alterar({ id: atividadeId, status }, usuarioAtivo);
  }

  /** O dono da atividade (de quem é a execução); a service confere o acesso de quem confirma. */
  private async donoDaAtividade(atividadeId: number, usuarioAtivo: JwtPayload): Promise<number> {
    const atividade = (await this.atividadeService.recuperar({ id: atividadeId }, usuarioAtivo)).dados;
    if (!atividade) throw new BusinessException('Atividade não encontrada');
    return atividade.usuarioId;
  }

  /** Reabre uma execução encerrada (fim nulo), desde que o dono não tenha outra em andamento. */
  private async reabrir(execucaoId: number, descricao: string, donoId: number, usuarioAtivo: JwtPayload): Promise<void> {
    if ((await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: donoId }, usuarioAtivo)).dados) {
      throw new BusinessException('Há outra execução em andamento: a anterior não pôde ser reaberta');
    }
    await this.execucaoService.alterar({ id: execucaoId, descricao, fimData: null }, usuarioAtivo);
  }
}
