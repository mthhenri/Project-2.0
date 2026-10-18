import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatBuscarDto, ChatMensagemEnviarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ChatService } from '../services/chat.service';
import { EventStreamResponse } from './event-stream.response';

/** Chat com a IA: qualquer usuário autenticado, sempre o próprio chat (a service filtra pelo dono). */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Resposta `text/event-stream`: eventos `trecho`, `ferramenta`, `proposta` e, no fim, `fim` ou `erro`. */
  @Post('mensagem')
  async enviarMensagem(@Body() dto: ChatMensagemEnviarDto, @ActiveUser() usuarioAtivo: JwtPayload, @Res() resposta: Response) {
    const fluxo = new EventStreamResponse(resposta);
    try {
      await this.chatService.enviarMensagem(usuarioAtivo, dto, (evento) => fluxo.enviar(evento));
    } finally {
      fluxo.encerrar();
    }
  }

  @Get('hoje')
  recuperarHoje(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.recuperarHoje(usuarioAtivo);
  }

  @Get('busca')
  buscar(@Query() dto: ChatBuscarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.buscar(dto, usuarioAtivo);
  }
}
