import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PontoService } from '../services/ponto.service';
import {
  PontoConsultarDto,
  PontoTodosConsultarDto,
  PontoMensalConsultarDto,
} from '@project20/shared';

@Controller('ponto')
@UseGuards(JwtAuthGuard)
export class PontoController {
  constructor(private readonly pontoService: PontoService) {}

  @Get('diario')
  consultarDiario(@Query() dto: PontoConsultarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.pontoService.consultarDiario(dto, usuarioAtivo);
  }

  @Get('todos')
  @GestorOnly()
  consultarTodos(@Query() dto: PontoTodosConsultarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.pontoService.consultarTodos(dto, usuarioAtivo);
  }

  @Get('mensal')
  consultarMensal(@Query() dto: PontoMensalConsultarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.pontoService.consultarMensal(dto, usuarioAtivo);
  }
}
