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
import { ProjetoService } from '../services/projeto.service';
import { ProjetoCriarDto, ProjetoListarDto, ProjetoAlterarDto, ProjetoVolumeListarDto, ProjetoVolumeAnualListarDto } from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ProjetoVolumeVigenciaCriarDto } from '@project20/shared';
import { ProjetoVolumeVigenciaService } from '../services/projeto-volume-vigencia.service';

const PROJETO_EXEMPLO = {
  id: 1,
  nome: 'Sistema de Gestão',
  codigo: 'PROJ-001',
  cor: '#6366f1',
  status: 'ATIVO',
  inicioData: '2026-01-01',
  previsaoFimData: '2026-12-31',
  createdDate: '2026-06-13T12:00:00.000Z',
};

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: ['Acesso não autorizado'] };

const NAO_ENCONTRADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Projeto não encontrado', erros: ['Projeto não encontrado'] };

@ApiTags('projeto')
@ApiBearerAuth()
@Controller('projeto')
export class ProjetoController {
  constructor(private readonly projetoService: ProjetoService, private readonly volumeVigenciaService: ProjetoVolumeVigenciaService) {}

  @ApiOperation({ summary: 'Criar novo projeto (somente gestor)' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso', schema: { example: { sucesso: true, dados: PROJETO_EXEMPLO, mensagem: 'Projeto criado com sucesso' } } })
  @ApiResponse({ status: 400, description: 'Código já em uso ou dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'Código de projeto já está em uso', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Post()
  criar(@Body() dto: ProjetoCriarDto) {
    return this.projetoService.criar(dto);
  }

  @ApiOperation({ summary: 'Listar projetos (gestor vê todos; desenvolvedor vê apenas os seus)' })
  @ApiResponse({ status: 200, description: 'Projetos listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar(
    @Query() filtros: ProjetoListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.projetoService.listar(filtros, usuarioAtivo);
  }

  // Declarada antes de `:id`, senão "volume" seria lido como um id.
  @ApiOperation({ summary: 'Volume de trabalho do mês por projeto: horas gastas × esperadas (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Volume do mês listado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Get('volume')
  listarVolume(@Query() filtros: ProjetoVolumeListarDto) {
    return this.projetoService.listarVolume(filtros);
  }

  @ApiOperation({ summary: 'Volume de trabalho do ano por projeto, mês a mês (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Volume do ano listado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Get('volume/anual')
  listarVolumeAnual(@Query() filtros: ProjetoVolumeAnualListarDto) {
    return this.projetoService.listarVolumeAnual(filtros);
  }

  @GestorOnly()
  @Get(':id/volume-vigencia')
  listarVigencias(@Param('id', ParseIntPipe) id: number) {
    return this.volumeVigenciaService.listar({ projetoId: id });
  }

  @GestorOnly()
  @Post(':id/volume-vigencia')
  criarVigencia(@Param('id', ParseIntPipe) id: number, @Body() dto: ProjetoVolumeVigenciaCriarDto) {
    return this.volumeVigenciaService.criar({ ...dto, projetoId: id });
  }

  @GestorOnly()
  @Delete(':id/volume-vigencia/:vigenciaId')
  excluirVigencia(@Param('id', ParseIntPipe) id: number, @Param('vigenciaId', ParseIntPipe) vigenciaId: number) {
    return this.volumeVigenciaService.excluir({ projetoId: id, vigenciaId });
  }

  @ApiOperation({ summary: 'Recuperar projeto por ID' })
  @ApiResponse({ status: 200, description: 'Projeto recuperado com sucesso', schema: { example: { sucesso: true, dados: PROJETO_EXEMPLO, mensagem: 'Projeto recuperado com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.projetoService.recuperar({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar projeto (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Projeto alterado com sucesso', schema: { example: { sucesso: true, dados: PROJETO_EXEMPLO, mensagem: 'Projeto alterado com sucesso' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'A previsão de fim deve ser posterior à data de início', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProjetoAlterarDto,
  ) {
    return this.projetoService.alterar({ ...dto, id });
  }

  @ApiOperation({ summary: 'Excluir projeto via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Projeto excluído com sucesso', schema: { example: { sucesso: true, dados: null, mensagem: 'Projeto excluído com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.projetoService.excluir({ id });
  }

  @ApiOperation({ summary: 'Restaurar projeto excluído desfazendo o soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Projeto restaurado com sucesso' })
  @ApiResponse({ status: 400, description: 'Conflito com um registro ativo ou dependência excluída', schema: { example: { sucesso: false, dados: null, mensagem: 'Registro ativo em conflito', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado entre as excluídos', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.projetoService.restaurar({ id });
  }
}
