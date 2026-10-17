import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
  AnotacaoAlterarDto,
  AnotacaoFeitoAnexarDto,
  AnotacaoListarDto,
  AnotacaoTextoAnexarDto,
  AnotacaoTrechoMoverDto,
  AnotacaoTrechoTrocarDto,
  TipoAnotacaoEnum,
} from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AnotacaoService } from '../services/anotacao.service';

/** Pad do usuário em cinco seções. O dono usa o próprio; gestor e administrador, o de qualquer um. */
@Controller('anotacao')
export class AnotacaoController {
  constructor(private readonly anotacaoService: AnotacaoService) {}

  @Get()
  listar(@Query() dto: AnotacaoListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.anotacaoService.listar(dto, usuarioAtivo);
  }

  @Put(':usuarioId/:tipo')
  alterar(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('tipo', new ParseEnumPipe(TipoAnotacaoEnum)) tipo: TipoAnotacaoEnum,
    @Body() dto: AnotacaoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.anotacaoService.alterar({ ...dto, usuarioId, tipo }, usuarioAtivo);
  }

  @Patch(':usuarioId/:tipo/trecho')
  trocarTrecho(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('tipo', new ParseEnumPipe(TipoAnotacaoEnum)) tipo: TipoAnotacaoEnum,
    @Body() dto: AnotacaoTrechoTrocarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.anotacaoService.trocarTrecho({ ...dto, usuarioId, tipo }, usuarioAtivo);
  }

  @Post(':usuarioId/:tipo/anexo')
  anexarTexto(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('tipo', new ParseEnumPipe(TipoAnotacaoEnum)) tipo: TipoAnotacaoEnum,
    @Body() dto: AnotacaoTextoAnexarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.anotacaoService.anexarTexto({ ...dto, usuarioId, tipo }, usuarioAtivo);
  }

  @Post(':usuarioId/feito')
  anexarFeito(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: AnotacaoFeitoAnexarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.anotacaoService.anexarFeito({ ...dto, usuarioId }, usuarioAtivo);
  }

  @Post(':usuarioId/mover')
  moverTrecho(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: AnotacaoTrechoMoverDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.anotacaoService.moverTrecho({ ...dto, usuarioId }, usuarioAtivo);
  }
}
