import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  DemandaExecutadaListarDto,
  DemandaAlterarDto,
  DemandaTextosAlterarDto,
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

  @ApiOperation({ summary: 'Criar nova demanda (auto-atribui o criador desenvolvedor; gestor tem acesso total sem atribuição)' })
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
    return this.demandaService.recuperarGrafo({ projetoId }, usuarioAtivo);
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
    return this.demandaService.recuperarArvore({ id }, usuarioAtivo);
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
    return this.demandaService.recuperarAncestral({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar demandas planejadas/pendentes para criação de atividade (desenvolvedor vê as atribuídas; gestor vê todas)' })
  @ApiResponse({ status: 200, description: 'Demandas atribuídas listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get('atribuidas')
  listarAtribuidas(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.demandaService.listarAtribuidas(usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar as últimas demandas que o próprio usuário executou, da execução mais recente para a mais antiga' })
  @ApiResponse({ status: 200, description: 'Demandas executadas listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get('executadas')
  listarExecutadas(@Query() filtros: DemandaExecutadaListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.demandaService.listarExecutadas(filtros, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar demandas não-concluídas do projeto com horas executadas e execuções ativas (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Planejamento do projeto recuperado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Get('planejamento')
  listarPlanejamento(
    @Query('projetoId', ParseIntPipe) projetoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.listarPlanejamento({ projetoId }, usuarioAtivo);
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
    return this.demandaService.recuperar({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar demanda' })
  @ApiResponse({ status: 200, description: 'Demanda alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem acesso à demanda', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar os três textos da demanda com a versão lida (desenvolvedor só se for membro e nunca a descrição do cliente)' })
  @ApiResponse({ status: 200, description: 'Textos alterados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Sem permissão para editar', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @ApiResponse({ status: 409, description: 'Alguém gravou uma versão mais nova dos textos' })
  @Patch(':id/textos')
  alterarTextos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaTextosAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.alterarTextos({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Excluir demanda via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Demanda excluída com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.demandaService.excluir({ id });
  }

  @ApiOperation({ summary: 'Restaurar demanda excluída desfazendo o soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Demanda restaurada com sucesso' })
  @ApiResponse({ status: 400, description: 'Conflito com um registro ativo ou dependência excluída', schema: { example: { sucesso: false, dados: null, mensagem: 'Registro ativo em conflito', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada entre as excluídas', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.demandaService.restaurar({ id });
  }

  @ApiOperation({ summary: 'Criar conexão entre demandas com prevenção de ciclos' })
  @ApiResponse({ status: 201, description: 'Conexão criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Ciclo detectado ou conexão duplicada', schema: { example: { sucesso: false, dados: null, mensagem: 'Essa conexão criaria um ciclo no grafo de demandas', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Post(':id/conexao')
  criarConexao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaConexaoCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.criarConexao({ ...dto, demandaOrigemId: id }, usuarioAtivo);
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
    return this.demandaService.listarConexoes({ id }, usuarioAtivo);
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
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.excluirConexao({ demandaId: id, conexaoId }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Sincronizar tags da demanda (gestor ou desenvolvedor membro)' })
  @ApiResponse({ status: 200, description: 'Tags alteradas com sucesso' })
  @ApiResponse({ status: 400, description: 'Tag inexistente', schema: { example: { sucesso: false, dados: null, mensagem: 'Tag com id 99 não encontrada', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor não é membro da demanda', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id/tag')
  alterarTagsDemanda(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaTagsAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.alterarTagsDemanda({ ...dto, demandaId: id }, usuarioAtivo);
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
    return this.demandaService.listarTagsDemanda({ id }, usuarioAtivo);
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
    return this.demandaService.listarMembros({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Atribuir membro à demanda (gestor atribui qualquer; desenvolvedor só a si mesmo)' })
  @ApiResponse({ status: 201, description: 'Membro atribuído com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário já atribuído', schema: { example: { sucesso: false, dados: null, mensagem: 'Usuário já está atribuído a esta demanda', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor só pode incluir a si mesmo', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda ou usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Post(':id/membro')
  atribuirMembro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DemandaUsuarioAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.atribuirMembro({ ...dto, demandaId: id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Remover membro da demanda (gestor remove qualquer; desenvolvedor só a si mesmo)' })
  @ApiResponse({ status: 200, description: 'Membro removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Não é possível remover o último membro', schema: { example: { sucesso: false, dados: null, mensagem: 'Não é possível remover o último membro da demanda', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor só pode remover a si mesmo', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda ou membro não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Delete(':id/membro/:usuarioId')
  removerMembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.demandaService.removerMembro({ demandaId: id, usuarioId }, usuarioAtivo);
  }
}
