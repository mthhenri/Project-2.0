import { Injectable } from '@nestjs/common';
import { PropostaMoverAtividadeDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { AtividadeService } from '../services/atividade.service';

/**
 * Executor da proposta `MOVER_ATIVIDADE` (task 229): muda a atividade de demanda pela `AtividadeService.alterar` com o usuário do token (a service
 * confere dono ou gestor, a demanda de destino em aberto e o acesso). As execuções vão junto. Desfazer devolve à demanda de origem, mas só se a
 * atividade ainda está na de destino.
 */
@Injectable()
export class MoverAtividadeExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.MOVER_ATIVIDADE;

  constructor(private readonly atividadeService: AtividadeService) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaMoverAtividadeDadosDto, dados);
    if (entrada.demandaDestinoId === entrada.demandaOrigemId) throw new BusinessException('A atividade já está nessa demanda');
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaMoverAtividadeDadosDto, dados);
    const atual = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Atividade não encontrada');
    if (atual.demandaId !== entrada.demandaOrigemId) throw new BusinessException('A atividade já não está na demanda de origem da proposta');
    await this.atividadeService.alterar({ id: entrada.atividadeId, demandaId: entrada.demandaDestinoId }, usuarioAtivo);
    return { atividadeId: entrada.atividadeId, demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const atividadeId = Number(resultado['atividadeId']);
    const origemId = Number(resultado['demandaOrigemId']);
    if (!Number.isInteger(atividadeId) || !Number.isInteger(origemId)) throw new BusinessException('Não há atividade a desfazer nesta proposta');
    const atual = (await this.atividadeService.recuperar({ id: atividadeId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Atividade não encontrada');
    if (atual.demandaId !== Number(resultado['demandaDestinoId'])) {
      throw new BusinessException('A atividade mudou de demanda depois: não dá para desfazer com segurança');
    }
    await this.atividadeService.alterar({ id: atividadeId, demandaId: origemId }, usuarioAtivo);
  }

  /** Obsoleta quando a atividade já está na demanda de destino (o usuário moveu à mão). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaMoverAtividadeDadosDto, dados);
    const atual = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    return !!atual && atual.demandaId === entrada.demandaDestinoId;
  }
}
