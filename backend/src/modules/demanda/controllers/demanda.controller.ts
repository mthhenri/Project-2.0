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
  DemandaConexaoCriarDto,
  DemandaTagsAtribuirDto,
  DemandaUsuarioAtribuirDto,
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

  @ApiOperation({ summary: 'Criar conexão entre demandas com prevenção de ciclos' })
  @ApiResponse({ status: 201, description: 'Conexão criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Ciclo detectado ou conexão duplicada', schema: { example: { sucesso: false, dados: null, mensagem: 'Essa conexão criaria um ciclo no grafo de demandas', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Post(':id/conexao')
  criarConexao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaConexaoCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.criarConexao(id, dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar conexões de uma demanda (saída, entrada bidirecional)' })
  @ApiResponse({ status: 200, description: 'Conexões listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/conexao')
  listarConexoes(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.listarConexoes(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Remover conexão entre demandas (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Conexão removida com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Conexão não encontrada', schema: { example: { sucesso: false, dados: null, mensagem: 'Conexão não encontrada', erros: [] } } })
  @GestorOnly()
  @Delete(':id/conexao/:conexaoId')
  excluirConexao(
    @Param('id', ParseIntPipe) id: number,
    @Param('conexaoId', ParseIntPipe) conexaoId: number,
  ) {
    return this.demandaService.excluirConexao(id, conexaoId);
  }

  @ApiOperation({ summary: 'Sincronizar tags da demanda (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Tags atualizadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Tag inexistente', schema: { example: { sucesso: false, dados: null, mensagem: 'Tag com id 99 não encontrada', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Put(':id/tag')
  atualizarTagsDemanda(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaTagsAtribuirDto,
  ) {
    return this.demandaService.atualizarTagsDemanda(id, dto);
  }

  @ApiOperation({ summary: 'Listar tags da demanda' })
  @ApiResponse({ status: 200, description: 'Tags listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/tag')
  listarTagsDemanda(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.listarTagsDemanda(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar membros da demanda' })
  @ApiResponse({ status: 200, description: 'Membros listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/membro')
  listarMembros(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.listarMembros(id, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Atribuir membro à demanda (somente gestor)' })
  @ApiResponse({ status: 201, description: 'Membro atribuído com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário já atribuído', schema: { example: { sucesso: false, dados: null, mensagem: 'Usuário já está atribuído a esta demanda', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda ou usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Post(':id/membro')
  atribuirMembro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaUsuarioAtribuirDto,
  ) {
    return this.demandaService.atribuirMembro(id, dto);
  }

  @ApiOperation({ summary: 'Remover membro da demanda (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Membro removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Não é possível remover o último membro', schema: { example: { sucesso: false, dados: null, mensagem: 'Não é possível remover o último membro da demanda', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda ou membro não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id/membro/:usuarioId')
  removerMembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.demandaService.removerMembro(id, usuarioId);
  }
}
