import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { PromptListarDto, PromptRascunhoSalvarDto, PromptTestarDto, TipoPromptEnum } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PromptService } from '../services/prompt.service';
import { PromptTesteService } from '../services/prompt-teste.service';

/** Prompts da IA: leitura e escrita exclusivas de administrador. */
@AdministradorOnly()
@Controller('prompt')
export class PromptController {
  constructor(
    private readonly promptService: PromptService,
    private readonly promptTesteService: PromptTesteService,
  ) {}

  @Get()
  listarTipos(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.promptService.listarTipos(usuarioAtivo);
  }

  @Get(':tipo/versoes')
  listarVersoes(
    @Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum,
    @Query() dto: PromptListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.promptService.listarVersoes(tipo, dto, usuarioAtivo);
  }

  @Post(':tipo/rascunho')
  salvarRascunho(
    @Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum,
    @Body() dto: PromptRascunhoSalvarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.promptService.salvarRascunho(tipo, dto, usuarioAtivo);
  }

  /** Testa um texto candidato contra narrativas, ao lado do prompt ativo; não grava nada. */
  @Post(':tipo/testar')
  testar(
    @Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum,
    @Body() dto: PromptTestarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.promptTesteService.testar(tipo, dto, usuarioAtivo);
  }

  @Post(':tipo/rascunho/ativar')
  ativarRascunho(@Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.promptService.ativarRascunho(tipo, usuarioAtivo);
  }

  @Post(':tipo/restaurar-padrao')
  restaurarPadrao(@Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.promptService.restaurarPadrao(tipo, usuarioAtivo);
  }

  @Delete(':tipo/rascunho')
  descartarRascunho(@Param('tipo', new ParseEnumPipe(TipoPromptEnum)) tipo: TipoPromptEnum, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.promptService.descartarRascunho(tipo, usuarioAtivo);
  }
}
