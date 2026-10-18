import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatMensagemEnviarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { EventStreamResponse } from '../../chat/controllers/event-stream.response';
import { CheckinSuspensaoService } from '../services/checkin-suspensao.service';
import { CheckinService } from '../services/checkin.service';

/** Check-in do próprio usuário (qualquer usuário autenticado; nunca o de outro). */
@Controller('checkin')
export class CheckinController {
  constructor(
    private readonly checkinSuspensaoService: CheckinSuspensaoService,
    private readonly checkinService: CheckinService,
  ) {}

  /** A situação do check-in agora: execução ativa (e o tempo), suspensão e a configuração (intervalos, duração recomendada, rigor). */
  @Get('situacao')
  consultarSituacao(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.checkinService.consultarSituacao(usuarioAtivo);
  }

  /** A conversa do check-in: `text/event-stream` no mesmo formato de `POST /chat/mensagem`; 409 sem execução em andamento. */
  @Post('mensagem')
  async enviarMensagem(@Body() dto: ChatMensagemEnviarDto, @ActiveUser() usuarioAtivo: JwtPayload, @Res() resposta: Response) {
    const fluxo = new EventStreamResponse(resposta);
    try {
      await this.checkinService.enviarMensagem(usuarioAtivo, dto, (evento) => fluxo.enviar(evento));
    } finally {
      fluxo.encerrar();
    }
  }

  /** O Electron e a barra superior perguntam se os check-ins estão suspensos. */
  @Get('suspensao')
  consultarSuspensao(@ActiveUser() usuarioAtivo: JwtPayload) {
    return {
      sucesso: true,
      dados: this.checkinSuspensaoService.consultar(usuarioAtivo.sub),
      mensagem: 'Suspensão dos check-ins consultada com sucesso',
    };
  }
}
