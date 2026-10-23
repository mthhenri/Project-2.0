import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  MensagemDiretaBuscarDto,
  MensagemDiretaDigitacaoAvisarDto,
  MensagemDiretaEnviarDto,
  MensagemDiretaLeituraAlterarDto,
  MensagemDiretaListarDto,
  MensagemDiretaPreferenciaAlterarDto,
  MensagemDiretaReferenciaBuscarDto,
  MensagemDiretaSilencioAlterarDto,
  ReferenciaMensagemDiretaEnum,
} from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { MensagemDiretaEventosService } from '../services/mensagem-direta-eventos.service';
import { MensagemDiretaService } from '../services/mensagem-direta.service';
import { FluxoDeEventosDiretos } from './fluxo-de-eventos-diretos';

/**
 * Chat entre colaboradores (task 208): qualquer usuário autenticado, sempre como a pessoa do token. O `usuarioId` da rota é a OUTRA pessoa da
 * conversa e entra no DTO aqui; nunca vem do corpo ou da query. A supervisão é a task 214.
 */
@Controller('mensagem-direta')
export class MensagemDiretaController {
  constructor(
    private readonly mensagemDiretaService: MensagemDiretaService,
    private readonly eventosService: MensagemDiretaEventosService,
  ) {}

  @Get('conversas')
  listarConversas(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.listarConversas(usuarioAtivo);
  }

  /** As pessoas com quem conversar (o seletor "Para"): qualquer usuário autenticado, ao contrário de `GET /usuario`. */
  @Get('pessoas')
  listarPessoas(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.listarPessoas(usuarioAtivo);
  }

  /** As sugestões do `#` do compositor: demandas e atividades que o usuário pode referenciar, pelo nome. */
  @Get('referencias')
  buscarReferencias(@Query() dto: MensagemDiretaReferenciaBuscarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.buscarReferencias(dto, usuarioAtivo);
  }

  /** O cartão de uma referência para quem está olhando: sem acesso, `acessivel: false` e nenhum dado. */
  @Get('referencia/:tipo/:id')
  recuperarReferencia(
    @Param('tipo', new ParseEnumPipe(ReferenciaMensagemDiretaEnum)) tipo: ReferenciaMensagemDiretaEnum,
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.mensagemDiretaService.recuperarReferencia({ tipo, id }, usuarioAtivo);
  }

  @Get('conversa/:usuarioId')
  listarConversa(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query() dto: MensagemDiretaListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.mensagemDiretaService.listarConversa({ ...dto, usuarioId }, usuarioAtivo);
  }

  @Post('mensagem')
  enviarMensagem(@Body() dto: MensagemDiretaEnviarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.enviarMensagem(dto, usuarioAtivo);
  }

  @Put('conversa/:usuarioId/leitura')
  alterarLeitura(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: MensagemDiretaLeituraAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.mensagemDiretaService.alterarLeitura({ ...dto, usuarioId }, usuarioAtivo);
  }

  /** O aviso de que o usuário está digitando para a outra pessoa; nada é gravado. */
  @Post('conversa/:usuarioId/digitando')
  avisarDigitacao(@Param('usuarioId', ParseIntPipe) usuarioId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    const dto: MensagemDiretaDigitacaoAvisarDto = { usuarioId };
    return this.mensagemDiretaService.avisarDigitacao(dto, usuarioAtivo);
  }

  @Put('conversa/:usuarioId/silencio')
  alterarSilencio(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: MensagemDiretaSilencioAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.mensagemDiretaService.alterarSilencio({ ...dto, usuarioId }, usuarioAtivo);
  }

  @Get('busca')
  buscar(@Query() dto: MensagemDiretaBuscarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.buscar(dto, usuarioAtivo);
  }

  @Get('preferencia')
  recuperarPreferencia(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.recuperarPreferencia(usuarioAtivo);
  }

  @Put('preferencia')
  alterarPreferencia(@Body() dto: MensagemDiretaPreferenciaAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.alterarPreferencia(dto, usuarioAtivo);
  }

  /**
   * O stream de eventos (`text/event-stream`, task 209): mensagem nova, leitura e presença. A resposta fica aberta até o cliente
   * desconectar ou a API parar (`ENCERRANDO`); o cliente reconecta e relê o que perdeu.
   */
  @Get('eventos')
  abrirEventos(@ActiveUser() usuarioAtivo: JwtPayload, @Res() resposta: Response) {
    const fechar = this.eventosService.abrir(usuarioAtivo, new FluxoDeEventosDiretos(resposta));
    resposta.on('close', fechar);
  }
}
