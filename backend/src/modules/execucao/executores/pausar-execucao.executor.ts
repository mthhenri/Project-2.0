import { Injectable } from '@nestjs/common';
import { PropostaPausarExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { ExecucaoService } from '../services/execucao.service';

/**
 * Executor da proposta `PAUSAR_EXECUCAO`: pausa (encerra) a execução ativa do usuário pela `ExecucaoService`, com a descrição da proposta
 * (o trabalho feito até ali, é assim que "vou almoçar" pausa) ou, sem ela, a provisória. A execução é a ativa **na hora de confirmar**.
 * Desfazer reabre a execução, desde que o usuário não tenha outra em andamento.
 */
@Injectable()
export class PausarExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.PAUSAR_EXECUCAO;

  constructor(private readonly execucaoService: ExecucaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaPausarExecucaoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaPausarExecucaoDadosDto, dados);
    const ativa = (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados;
    if (!ativa) throw new BusinessException('Você não tem execução em andamento');

    const descricaoAnterior = ativa.descricao;
    const descricao = entrada.descricao?.trim() || descricaoAnterior.trim();
    if (!descricao) throw new BusinessException('Informe a descrição do que foi feito para pausar a execução');

    await this.execucaoService.encerrar({ id: ativa.id, descricao }, usuarioAtivo);
    return { execucaoId: ativa.id, atividadeId: ativa.atividadeId, descricaoAnterior };
  }

  /** Obsoleta quando já não há execução em andamento (o usuário a pausou à mão). */
  async estaObsoleta(_dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    return (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados === null;
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const execucaoId = Number(resultado['execucaoId']);
    if (!Number.isInteger(execucaoId)) throw new BusinessException('Não há execução a desfazer nesta proposta');
    if ((await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados) {
      throw new BusinessException('Você já tem outra execução em andamento: a pausa não pôde ser desfeita');
    }
    const pausada = (await this.execucaoService.recuperar({ id: execucaoId }, usuarioAtivo)).dados;
    if (!pausada?.fimData) throw new BusinessException('A execução já está em andamento');
    await this.execucaoService.alterar({ id: execucaoId, descricao: String(resultado['descricaoAnterior'] ?? pausada.descricao), fimData: null }, usuarioAtivo);
  }
}
