import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import {
  MensagemDiretaBuscarDto,
  MensagemDiretaEnviarDto,
  MensagemDiretaLeituraAlterarDto,
  MensagemDiretaListarDto,
  MensagemDiretaPreferenciaAlterarDto,
  MensagemDiretaSilencioAlterarDto,
} from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { MensagemDiretaService } from '../services/mensagem-direta.service';

/**
 * Chat entre colaboradores (task 208): qualquer usuário autenticado, sempre como a pessoa do token. O `usuarioId` da rota é a OUTRA pessoa da
 * conversa e entra no DTO aqui; nunca vem do corpo ou da query. O stream de eventos é a task 209 e a supervisão, a 214.
 */
@Controller('mensagem-direta')
export class MensagemDiretaController {
  constructor(private readonly mensagemDiretaService: MensagemDiretaService) {}

  @Get('conversas')
  listarConversas(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.mensagemDiretaService.listarConversas(usuarioAtivo);
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
}
