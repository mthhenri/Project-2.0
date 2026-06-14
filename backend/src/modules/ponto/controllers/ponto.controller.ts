import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PontoService } from '../services/ponto.service';
import { PontoConsultarDto } from '@project20/shared';

@Controller('ponto')
@UseGuards(JwtAuthGuard)
export class PontoController {
  constructor(private readonly pontoService: PontoService) {}

  @Get('diario')
  consultarDiario(@Query() dto: PontoConsultarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.pontoService.consultarDiario(dto, usuarioAtivo);
  }
}
