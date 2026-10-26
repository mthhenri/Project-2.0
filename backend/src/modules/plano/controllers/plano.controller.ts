import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PlanoPontoService } from '../services/plano-ponto.service';
import { PlanoService } from '../services/plano.service';
import {
  PlanoAlterarDto,
  PlanoArquivarDto,
  PlanoCriarDto,
  PlanoDemandaLigarDto,
  PlanoListarDto,
  PlanoPontoCriarDto,
  PlanoPontoSituacaoAlterarDto,
  PlanoProjetoAtribuirDto,
  PlanoSoloMarcarDto,
} from '@project20/shared';

@Controller('plano')
@UseGuards(JwtAuthGuard)
export class PlanoController {
  constructor(
    private readonly planoService: PlanoService,
    private readonly planoPontoService: PlanoPontoService,
  ) {}

  @Post()
  criar(@Body() dto: PlanoCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.criar(dto, usuarioAtivo);
  }

  @Get()
  listar(@Query() dto: PlanoListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.listar(dto, usuarioAtivo);
  }

  @Get(':id')
  recuperar(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.recuperar({ id }, usuarioAtivo);
  }

  @Put(':id')
  alterar(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @Patch(':id/solo')
  marcarSolo(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoSoloMarcarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.marcarSolo({ ...dto, id }, usuarioAtivo);
  }

  @Patch(':id/arquivo')
  arquivar(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoArquivarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.arquivar({ ...dto, id }, usuarioAtivo);
  }

  @Put(':id/demanda')
  ligarDemanda(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoDemandaLigarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.ligarDemanda({ ...dto, id }, usuarioAtivo);
  }

  @Patch(':id/projeto')
  atribuirProjeto(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoProjetoAtribuirDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.atribuirProjeto({ ...dto, id }, usuarioAtivo);
  }

  /** Pontos em aberto do plano (task 235): o mesmo acesso do plano. */
  @Get(':id/ponto')
  listarPontos(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoPontoService.listar({ planoId: id }, usuarioAtivo);
  }

  @Post(':id/ponto')
  criarPonto(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanoPontoCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoPontoService.criar({ ...dto, planoId: id }, usuarioAtivo);
  }

  @Patch(':id/ponto/:pontoId/situacao')
  alterarSituacaoDoPonto(
    @Param('id', ParseIntPipe) id: number,
    @Param('pontoId', ParseIntPipe) pontoId: number,
    @Body() dto: PlanoPontoSituacaoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.planoPontoService.alterarSituacao({ ...dto, planoId: id, id: pontoId }, usuarioAtivo);
  }

  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.planoService.excluir({ id }, usuarioAtivo);
  }
}
