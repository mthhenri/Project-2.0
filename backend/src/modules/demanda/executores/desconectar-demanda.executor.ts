import { Injectable } from '@nestjs/common';
import { PropostaDesconectarDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `DESCONECTAR_DEMANDA` (task 230): remove a conexão pela `DemandaService.excluirConexao` com o usuário do token (que exige gestor);
 * as demandas não mudam de lugar. Desfazer recria a conexão pela `criarConexao`, que recusa conexão repetida e **ciclo** (CTE recursiva antes do INSERT),
 * no mesmo sentido em que ela estava.
 */
@Injectable()
export class DesconectarDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.DESCONECTAR_DEMANDA;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaDesconectarDemandaDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaDesconectarDemandaDadosDto, dados);
    const conexao = await this.demandaRepositorio.recuperarConexaoPorPar({ demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId });
    if (!conexao) throw new BusinessException('A conexão entre essas demandas já não existe');
    await this.demandaService.excluirConexao({ demandaId: entrada.demandaOrigemId, conexaoId: conexao.id }, usuarioAtivo);
    return { demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId, ehBidirecional: conexao.ehBidirecional };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const demandaOrigemId = Number(resultado['demandaOrigemId']);
    const demandaDestinoId = Number(resultado['demandaDestinoId']);
    if (!Number.isInteger(demandaOrigemId) || !Number.isInteger(demandaDestinoId)) throw new BusinessException('Não há conexão a desfazer nesta proposta');
    await this.demandaService.criarConexao({ demandaOrigemId, demandaDestinoId, ehBidirecional: resultado['ehBidirecional'] === true }, usuarioAtivo);
  }

  /** Obsoleta quando a conexão já não existe (alguém a removeu à mão). */
  async estaObsoleta(dados: Record<string, unknown>, _usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaDesconectarDemandaDadosDto, dados);
    return !(await this.demandaRepositorio.recuperarConexaoPorPar({ demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId }));
  }
}
