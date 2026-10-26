import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatBuscarDto, ChatConversaRecuperarDto, ChatConversaTituloAlterarDto, ChatMensagemEnviarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ChatPlanoService } from '../services/chat-plano.service';
import { ChatService } from '../services/chat.service';
import { EventStreamResponse } from './event-stream.response';

/** Chat com a IA: qualquer usuário autenticado, sempre o próprio chat (a service filtra pelo dono). */
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatPlanoService: ChatPlanoService,
  ) {}

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

  /** O bom dia proativo (mesmo formato de `POST /chat/mensagem`): só age se a conversa de hoje ainda não tem mensagem da IA; senão, 409. */
  @Post('bom-dia')
  async iniciarBomDia(@ActiveUser() usuarioAtivo: JwtPayload, @Res() resposta: Response) {
    const fluxo = new EventStreamResponse(resposta);
    try {
      await this.chatService.iniciarBomDia(usuarioAtivo, (evento) => fluxo.enviar(evento));
    } finally {
      fluxo.encerrar();
    }
  }

  /** A retomada depois de uma queda da IA (task 158; mesmo formato): 409 sem conversa hoje, com a IA desligada ou ainda respondendo. */
  @Post('retomada')
  async retomarAposQueda(@ActiveUser() usuarioAtivo: JwtPayload, @Res() resposta: Response) {
    const fluxo = new EventStreamResponse(resposta);
    try {
      await this.chatService.retomarAposQueda(usuarioAtivo, (evento) => fluxo.enviar(evento));
    } finally {
      fluxo.encerrar();
    }
  }

  /** A conversa de um plano (task 234): as mensagens de todos que têm acesso ao plano. 404 para quem não o vê. */
  @Get('plano/:planoId')
  recuperarConversaDoPlano(@Param('planoId', ParseIntPipe) planoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatPlanoService.recuperarConversa({ id: planoId }, usuarioAtivo);
  }

  /** Mensagem na conversa do plano (mesmo formato de `POST /chat/mensagem`): 404 sem acesso ao plano, 409 com a IA desligada ou ainda respondendo. */
  @Post('plano/:planoId/mensagem')
  async enviarMensagemNoPlano(
    @Param('planoId', ParseIntPipe) planoId: number,
    @Body() dto: ChatMensagemEnviarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
    @Res() resposta: Response,
  ) {
    const fluxo = new EventStreamResponse(resposta);
    try {
      await this.chatPlanoService.enviarMensagem({ id: planoId }, dto, usuarioAtivo, (evento) => fluxo.enviar(evento));
    } finally {
      fluxo.encerrar();
    }
  }

  @Get('hoje')
  recuperarHoje(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.recuperarHoje(usuarioAtivo);
  }

  @Get('conversas')
  listarConversas(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.listarConversas(usuarioAtivo);
  }

  @Get('conversa/:data')
  recuperarConversa(@Param() dto: ChatConversaRecuperarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.recuperarConversa(dto, usuarioAtivo);
  }

  /** Renomeia a conversa de um dia do próprio usuário; em branco, volta ao nome padrão. */
  @Put('conversa/:data/titulo')
  alterarTituloConversa(@Param() parametros: ChatConversaRecuperarDto, @Body() dto: ChatConversaTituloAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.alterarTituloConversa({ ...dto, ...parametros }, usuarioAtivo);
  }

  @Get('busca')
  buscar(@Query() dto: ChatBuscarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.chatService.buscar(dto, usuarioAtivo);
  }
}
