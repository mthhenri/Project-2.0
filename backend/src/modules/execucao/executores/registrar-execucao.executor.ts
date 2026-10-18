import { Injectable } from '@nestjs/common';
import { PropostaRegistrarExecucaoDadosDto, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { ExecucaoService } from '../services/execucao.service';

/**
 * Executor da proposta `REGISTRAR_EXECUCAO`: registra pela `ExecucaoService` com os instantes que a ferramenta já resolveu (valem a
 * coerência das datas e a ausência de sobreposição, conferidas de novo aqui). Só o gestor: a `ExecucaoService.registrar` não confere
 * o tipo (quem barra é o `@GestorOnly` da controller), então o executor confere. Desfazer exclui o registro criado.
 */
@Injectable()
export class RegistrarExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.REGISTRAR_EXECUCAO;

  constructor(private readonly execucaoService: ExecucaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaRegistrarExecucaoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    this.exigirGestor(usuarioAtivo);
    const entrada = validarDadosDaProposta(PropostaRegistrarExecucaoDadosDto, dados);
    const registrada = (
      await this.execucaoService.registrar(
        { atividadeId: entrada.atividadeId, inicioData: entrada.inicioData, fimData: entrada.fimData, descricao: entrada.descricao },
        usuarioAtivo,
      )
    ).dados;
    return { execucaoId: registrada?.id, atividadeId: entrada.atividadeId };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    this.exigirGestor(usuarioAtivo);
    const execucaoId = Number(resultado['execucaoId']);
    if (!Number.isInteger(execucaoId)) throw new BusinessException('Não há execução a desfazer nesta proposta');
    await this.execucaoService.excluir({ id: execucaoId }, usuarioAtivo);
  }

  private exigirGestor(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Só o gestor registra execuções passadas');
  }
}
