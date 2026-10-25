import { Injectable } from '@nestjs/common';
import { PropostaConcluirDemandaDadosDto, TipoDemandaStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `CONCLUIR_DEMANDA` (task 229): conclui pela `DemandaService.alterar` com o usuário do token (valem o acesso e as demais regras
 * da tela). As atividades abertas **não mudam**: só a demanda é concluída. Desfazer volta o status de antes, mas só se a demanda ainda está concluída.
 */
@Injectable()
export class ConcluirDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CONCLUIR_DEMANDA;

  constructor(private readonly demandaService: DemandaService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaConcluirDemandaDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaConcluirDemandaDadosDto, dados);
    const atual = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');
    if (atual.status === TipoDemandaStatusEnum.CONCLUIDA) throw new BusinessException('A demanda já está concluída');
    await this.demandaService.alterar({ id: entrada.demandaId, status: TipoDemandaStatusEnum.CONCLUIDA }, usuarioAtivo);
    return { demandaId: entrada.demandaId, statusAnterior: atual.status };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const demandaId = Number(resultado['demandaId']);
    if (!Number.isInteger(demandaId)) throw new BusinessException('Não há demanda a desfazer nesta proposta');
    const atual = (await this.demandaService.recuperar({ id: demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');
    if (atual.status !== TipoDemandaStatusEnum.CONCLUIDA) {
      throw new BusinessException('A demanda mudou depois de concluída: não dá para desfazer com segurança');
    }
    await this.demandaService.alterar({ id: demandaId, status: resultado['statusAnterior'] as TipoDemandaStatusEnum }, usuarioAtivo);
  }

  /** Obsoleta quando a demanda já está concluída (alguém concluiu à mão). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaConcluirDemandaDadosDto, dados);
    const atual = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    return !!atual && atual.status === TipoDemandaStatusEnum.CONCLUIDA;
  }
}
