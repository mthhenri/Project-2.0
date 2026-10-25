import { Injectable } from '@nestjs/common';
import { PropostaConectarDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `CONECTAR_DEMANDA`: cria a conexão pela `DemandaService.criarConexao`, que recusa demanda repetida, conexão
 * duplicada e **ciclo** (a CTE recursiva roda antes do INSERT; o erro volta claro ao cartão). A regra "só gestor" é da própria service
 * (`criarConexao` e `excluirConexao` recebem o usuário, task 228). Desfazer remove a conexão criada (soft delete).
 */
@Injectable()
export class ConectarDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CONECTAR_DEMANDA;

  constructor(private readonly demandaService: DemandaService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaConectarDemandaDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaConectarDemandaDadosDto, dados);
    const criada = await this.demandaService.criarConexao({
      demandaOrigemId: entrada.demandaOrigemId,
      demandaDestinoId: entrada.demandaDestinoId,
      ehBidirecional: entrada.ehBidirecional ?? false,
    }, usuarioAtivo);
    return { conexaoId: criada.dados?.id, demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const conexaoId = Number(resultado['conexaoId']);
    const demandaId = Number(resultado['demandaOrigemId']);
    if (!Number.isInteger(conexaoId) || !Number.isInteger(demandaId)) throw new BusinessException('Não há conexão a desfazer nesta proposta');
    await this.demandaService.excluirConexao({ demandaId, conexaoId }, usuarioAtivo);
  }
}
