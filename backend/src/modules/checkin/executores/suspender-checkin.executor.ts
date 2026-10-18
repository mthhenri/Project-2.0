import { Injectable } from '@nestjs/common';
import { PropostaSuspenderCheckinDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { CheckinSuspensaoService } from '../services/checkin-suspensao.service';

/**
 * Executor da proposta `SUSPENDER_CHECKIN`: suspende ou retoma os check-ins **do usuário do token**. Desfazer faz o inverso: desfazer
 * uma suspensão retoma; desfazer uma retomada suspende de novo, com o motivo de antes.
 */
@Injectable()
export class SuspenderCheckinExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.SUSPENDER_CHECKIN;

  constructor(private readonly checkinSuspensaoService: CheckinSuspensaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaSuspenderCheckinDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaSuspenderCheckinDadosDto, dados);
    if (entrada.acao === 'SUSPENDER') {
      this.checkinSuspensaoService.suspender(usuarioAtivo.sub, entrada.motivo ?? null);
      return { acao: 'SUSPENDER' };
    }
    const anterior = this.checkinSuspensaoService.retomar(usuarioAtivo.sub);
    if (!anterior) throw new BusinessException('Os check-ins não estavam suspensos');
    return { acao: 'RETOMAR', motivoAnterior: anterior.motivo };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    if (resultado['acao'] === 'SUSPENDER') {
      this.checkinSuspensaoService.retomar(usuarioAtivo.sub);
      return;
    }
    if (resultado['acao'] === 'RETOMAR') {
      this.checkinSuspensaoService.suspender(usuarioAtivo.sub, typeof resultado['motivoAnterior'] === 'string' ? resultado['motivoAnterior'] : null);
      return;
    }
    throw new BusinessException('Não há suspensão a desfazer nesta proposta');
  }
}
