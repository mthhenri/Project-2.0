import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DemandaService } from '../services/demanda.service';
import {
  DemandaCriarDto,
  DemandaListarDto,
  DemandaAtualizarDto,
} from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: [] };
const NAO_ENCONTRADO_EXEMPLO  = { sucesso: false, dados: null, mensagem: 'Demanda não encontrada', erros: [] };

@ApiTags('demanda')
@ApiBearerAuth()
@Controller('demanda')
export class DemandaController {
  constructor(private readonly demandaService: DemandaService) {}

  @ApiOperation({ summary: 'Criar nova demanda (auto-atribui criador e gestores ativos)' })
  @ApiResponse({ status: 201, description: 'Demanda criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'A demanda pai deve pertencer ao mesmo projeto', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem acesso ao projeto', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Post()
  criar(
    @Body() dto: DemandaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.criar(dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar demandas (gestor vê todas; desenvolvedor vê apenas as suas)' })
  @ApiResponse({ status: 200, description: 'Demandas listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar(
    @Query() filtros: DemandaListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.listar(filtros, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar grafo de demandas de um projeto' })
  @ApiResponse({ status: 200, description: 'Grafo de demandas recuperado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem acesso ao projeto', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get('grafo')
  recuperarGrafo(
    @Query('projetoId', ParseIntPipe) projetoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.recuperarGrafo(projetoId, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar árvore de descendentes de uma demanda' })
  @ApiResponse({ status: 200, description: 'Árvore de demanda recuperada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/arvore')
  recuperarArvore(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.recuperarArvore(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar ancestrais de uma demanda (breadcrumb)' })
  @ApiResponse({ status: 200, description: 'Ancestrais recuperados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/ancestral')
  recuperarAncestral(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.recuperarAncestral(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar demanda por ID' })
  @ApiResponse({ status: 200, description: 'Demanda recuperada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.recuperar(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Atualizar demanda' })
  @ApiResponse({ status: 200, description: 'Demanda atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem acesso à demanda', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaAtualizarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.atualizar(id, dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Excluir demanda via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Demanda excluída com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.demandaService.excluir(id);
  }
}
