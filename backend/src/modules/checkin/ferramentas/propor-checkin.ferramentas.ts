import { Injectable } from '@nestjs/common';
import { ProporRetomarCheckinDto, ProporSuspenderCheckinDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { CheckinSuspensaoService } from '../services/checkin-suspensao.service';

/** Só existem enquanto a flag "check-in inteligente" da configuração da IA está ligada (sem configuração carregada ainda, valem). */
function checkinInteligenteLigado(configuracaoIaService: ConfiguracaoIaService): boolean {
  return configuracaoIaService.obterAtivaEmCache()?.checkinInteligente ?? true;
}

/** Propõe suspender os check-ins (reunião); **não suspende nada** até o usuário confirmar. */
@Injectable()
export class ProporSuspenderCheckinFerramenta extends FerramentaPropostaIa<ProporSuspenderCheckinDto> {
  readonly nome = 'propor_suspender_checkin';
  readonly descricao =
    'Propõe suspender os check-ins periódicos do usuário até ele voltar (ou até o fim do dia). Use quando ele disser que vai entrar numa reunião, ' +
    'numa chamada ou em algo que o impede de responder. Passe motivo curto (ex.: "reunião de planejamento"). Nada é suspenso até o usuário confirmar.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporSuspenderCheckinDto;
  readonly tipoProposta = TipoPropostaIaEnum.SUSPENDER_CHECKIN;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly checkinSuspensaoService: CheckinSuspensaoService,
    private readonly configuracaoIaService: ConfiguracaoIaService,
  ) {
    super(propostaIaService);
  }

  habilitada(): boolean {
    return checkinInteligenteLigado(this.configuracaoIaService);
  }

  protected montarDados(entrada: ProporSuspenderCheckinDto, usuarioAtivo: JwtPayload): Record<string, unknown> {
    if (this.checkinSuspensaoService.consultar(usuarioAtivo.sub).suspenso) throw new BusinessException('Os check-ins já estão suspensos.');
    return { acao: 'SUSPENDER', ...(entrada.motivo?.trim() ? { motivo: entrada.motivo.trim() } : {}) };
  }
}

/** Propõe retomar os check-ins (o usuário voltou da reunião); **não retoma nada** até o usuário confirmar. Só vale com eles suspensos. */
@Injectable()
export class ProporRetomarCheckinFerramenta extends FerramentaPropostaIa<ProporRetomarCheckinDto> {
  readonly nome = 'propor_retomar_checkin';
  readonly descricao =
    'Propõe retomar os check-ins periódicos que estavam suspensos. Use quando o usuário disser que voltou da reunião ("voltei"). ' +
    'Só funciona com os check-ins suspensos. Nada é retomado até o usuário confirmar.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporRetomarCheckinDto;
  readonly tipoProposta = TipoPropostaIaEnum.SUSPENDER_CHECKIN;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly checkinSuspensaoService: CheckinSuspensaoService,
    private readonly configuracaoIaService: ConfiguracaoIaService,
  ) {
    super(propostaIaService);
  }

  habilitada(): boolean {
    return checkinInteligenteLigado(this.configuracaoIaService);
  }

  protected montarDados(_entrada: ProporRetomarCheckinDto, usuarioAtivo: JwtPayload): Record<string, unknown> {
    if (!this.checkinSuspensaoService.consultar(usuarioAtivo.sub).suspenso) throw new BusinessException('Os check-ins não estão suspensos: não há o que retomar.');
    return { acao: 'RETOMAR' };
  }
}
