import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PropostaIaAjustarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PropostaIaService } from '../services/proposta-ia.service';

/** Resolução das propostas da IA: qualquer usuário autenticado, mas só as próprias (a service confere o dono). Criar não tem rota. */
@Controller('proposta-ia')
export class PropostaIaController {
  constructor(private readonly propostaIaService: PropostaIaService) {}

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
