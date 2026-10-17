import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConfiguracaoIaCriarDto, ConfiguracaoIaListarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaService } from '../services/configuracao-ia.service';

/** Configuração da IA: leitura e escrita exclusivas de administrador. */
@AdministradorOnly()
@Controller('configuracao-ia')
export class ConfiguracaoIaController {
  constructor(private readonly configuracaoIaService: ConfiguracaoIaService) {}

  @Get()
  recuperarAtiva(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.configuracaoIaService.recuperarAtiva(usuarioAtivo);
  }

  @Get('versoes')
  listar(@Query() dto: ConfiguracaoIaListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.configuracaoIaService.listar(dto, usuarioAtivo);
  }

  @Post()
  criar(@Body() dto: ConfiguracaoIaCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.configuracaoIaService.criar(dto, usuarioAtivo);
  }
}
