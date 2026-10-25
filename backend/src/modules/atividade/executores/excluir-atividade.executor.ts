import { Injectable } from '@nestjs/common';
import { PropostaExcluirAtividadeDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';

/**
 * Executor da proposta `EXCLUIR_ATIVIDADE` (task 230): exclui (soft delete) pela `AtividadeService.excluir` com o usuário do token, que confere dono ou
 * gestor. **Recusa se a atividade ganhou execução** entre a proposta e o clique. Desfazer usa `AtividadeService.restaurar`, só se a atividade continua
 * excluída e sem execução nova.
 */
@Injectable()
export class ExcluirAtividadeExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.EXCLUIR_ATIVIDADE;

  constructor(
    private readonly atividadeService: AtividadeService,
    private readonly atividadeRepositorio: AtividadeRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaExcluirAtividadeDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaExcluirAtividadeDadosDto, dados);
    // `recuperar` confere a existência e o acesso do usuário à atividade.
    await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo);
    if (await this.atividadeRepositorio.possuiExecucao({ id: entrada.atividadeId })) {
      throw new BusinessException('A atividade já tem execuções: a IA não a exclui. A exclusão, nesse caso, é feita pela tela de Atividades');
    }
    await this.atividadeService.excluir({ id: entrada.atividadeId }, usuarioAtivo);
    return { atividadeId: entrada.atividadeId };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const atividadeId = Number(resultado['atividadeId']);
    if (!Number.isInteger(atividadeId)) throw new BusinessException('Não há atividade a desfazer nesta proposta');
    if (await this.atividadeRepositorio.possuiExecucao({ id: atividadeId })) {
      throw new BusinessException('A atividade tem execução nova: não dá para desfazer com segurança');
    }
    // `restaurar` só acha a atividade se ela continua excluída, e confere dono ou gestor e que a demanda continua ativa.
    await this.atividadeService.restaurar({ id: atividadeId }, usuarioAtivo);
  }
}
