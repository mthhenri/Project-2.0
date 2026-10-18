import { Injectable } from '@nestjs/common';
import { ChatEventoDto, ChatMensagemEnviarDto, CheckinSituacaoConsultadaDto, ContextoChatEnum, StandardResponse } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ChatService } from '../../chat/services/chat.service';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { recuperarExecucaoAtivaDetalhada } from '../../execucao/domain/execucao-ativa-detalhada';
import { ExecucaoService } from '../../execucao/services/execucao.service';
import { checkinDisparado } from '../domain/agenda-do-checkin';
import { montarContextoDoCheckin } from '../domain/contexto-do-checkin';
import { CheckinAgendaService } from './checkin-agenda.service';
import { CheckinSuspensaoService } from './checkin-suspensao.service';

/**
 * Check-in do desenvolvedor (task 149): a situação (execução ativa, suspensão e a configuração) e a conversa do check-in, que roda na
 * conversa do dia com o contexto `CHECKIN`, o prompt `CHECKIN` e o contexto calculado aqui (tempo e rigor proporcional). Só vale com
 * execução em andamento.
 */
@Injectable()
export class CheckinService {
  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly configuracaoIaService: ConfiguracaoIaService,
    private readonly checkinSuspensaoService: CheckinSuspensaoService,
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
    private readonly checkinAgendaService: CheckinAgendaService,
  ) {}

  async consultarSituacao(usuarioAtivo: JwtPayload): Promise<StandardResponse<CheckinSituacaoConsultadaDto>> {
    return { sucesso: true, dados: await this.montarSituacao(usuarioAtivo), mensagem: 'Situação do check-in consultada com sucesso' };
  }

  /** Mensagem do check-in (mesmo formato do chat). 409 sem execução em andamento, antes de qualquer evento. */
  async enviarMensagem(usuarioAtivo: JwtPayload, dto: ChatMensagemEnviarDto, emitir: (evento: ChatEventoDto) => void): Promise<void> {
    const situacao = await this.montarSituacao(usuarioAtivo);
    if (!situacao.haCheckin || !situacao.execucao) throw new ConflictException('Não há execução em andamento: não há check-in');

    const fusoHorario = this.configService.obter().aplicacao.fusoHorario;
    const execucao = situacao.execucao;
    const instrucoesExtras = montarContextoDoCheckin({
      atividade: execucao.atividade,
      demanda: execucao.demanda,
      projeto: execucao.projeto,
      descricaoProvisoria: execucao.descricao,
      inicio: new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(execucao.inicio)),
      minutos: execucao.minutos,
      duracaoRecomendadaMinutos: situacao.duracaoRecomendadaMinutos,
      rigorProporcional: situacao.rigorProporcional,
    });
    await this.chatService.enviarMensagem(usuarioAtivo, dto, emitir, { contexto: ContextoChatEnum.CHECKIN, instrucoesExtras });
  }

  private async montarSituacao(usuarioAtivo: JwtPayload): Promise<CheckinSituacaoConsultadaDto> {
    const configuracao = await this.configuracaoIaService.obterAtiva();
    const ativa = await recuperarExecucaoAtivaDetalhada(this.execucaoService, usuarioAtivo);
    const agora = this.agora();
    const minutos = ativa ? Math.max(0, Math.round((agora.getTime() - ativa.inicioData.getTime()) / 60_000)) : 0;
    const suspensao = this.checkinSuspensaoService.consultar(usuarioAtivo.sub);
    const agenda = this.checkinAgendaService.atualizar(usuarioAtivo.sub, {
      execucao: ativa ? { id: ativa.id, inicio: ativa.inicioData } : null,
      suspenso: suspensao.suspenso,
      retomadaEm: this.checkinSuspensaoService.ultimaRetomada(usuarioAtivo.sub),
      agora,
      minimoMinutos: configuracao.checkinMinimoMinutos,
      maximoMinutos: configuracao.checkinMaximoMinutos,
    });
    return {
      haCheckin: ativa !== null,
      execucao: ativa
        ? {
            id: ativa.id,
            atividade: ativa.nomeAtividade ?? '',
            demanda: ativa.nomeDemanda ?? '',
            projeto: ativa.nomeProjeto ?? '',
            descricao: ativa.descricao,
            inicio: ativa.inicioData,
            minutos,
          }
        : null,
      suspensao,
      checkinMinimoMinutos: configuracao.checkinMinimoMinutos,
      checkinMaximoMinutos: configuracao.checkinMaximoMinutos,
      duracaoRecomendadaMinutos: configuracao.duracaoRecomendadaMinutos,
      rigorProporcional: configuracao.rigorProporcional,
      acimaDoRecomendado: ativa !== null && minutos > configuracao.duracaoRecomendadaMinutos,
      proximoCheckinData: agenda?.proximoEm ?? null,
      disparado: checkinDisparado(agenda, agora),
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
