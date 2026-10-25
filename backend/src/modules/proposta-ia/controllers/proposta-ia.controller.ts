import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PropostaIaAjustarDto, PropostaIaGrupoConfirmarDto, PropostaIaGrupoDesfazerDto, PropostaIaGrupoRecusarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PropostaIaService } from '../services/proposta-ia.service';

/** Resolução das propostas da IA: qualquer usuário autenticado, mas só as próprias (a service confere o dono). Criar não tem rota. */
@Controller('proposta-ia')
export class PropostaIaController {
  constructor(private readonly propostaIaService: PropostaIaService) {}

  // As rotas do grupo vêm antes das de `:id`: `grupo/confirmar` também casaria com `:id/confirmar` e `grupo` não é um número.
  @Post('grupo/confirmar')
  confirmarGrupo(@Body() dto: PropostaIaGrupoConfirmarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.confirmarGrupo(dto, usuarioAtivo);
  }

  @Post('grupo/recusar')
  recusarGrupo(@Body() dto: PropostaIaGrupoRecusarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.recusarGrupo(dto, usuarioAtivo);
  }

  @Post('grupo/desfazer')
  desfazerGrupo(@Body() dto: PropostaIaGrupoDesfazerDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.desfazerGrupo(dto, usuarioAtivo);
  }

  @Get(':id')
  recuperarPorId(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.recuperarPorId(id, usuarioAtivo);
  }

  @Post(':id/confirmar')
  confirmar(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.confirmar(id, usuarioAtivo);
  }

  @Post(':id/ajustar')
  ajustar(@Param('id', ParseIntPipe) id: number, @Body() dto: PropostaIaAjustarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.ajustar(id, dto, usuarioAtivo);
  }

  @Post(':id/recusar')
  recusar(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.recusar(id, usuarioAtivo);
  }

  @Post(':id/desfazer')
  desfazer(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.propostaIaService.desfazer(id, usuarioAtivo);
  }
}
