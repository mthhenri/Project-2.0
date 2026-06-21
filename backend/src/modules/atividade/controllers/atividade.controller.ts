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
import { AtividadeService } from '../services/atividade.service';
import {
  AtividadeCriarDto,
  AtividadeListarDto,
  AtividadeAlterarDto,
  AtividadeTagsAtribuirDto,
} from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: [] };
const NAO_ENCONTRADO_EXEMPLO  = { sucesso: false, dados: null, mensagem: 'Atividade não encontrada', erros: [] };

@ApiTags('atividade')
@ApiBearerAuth()
@Controller('atividade')
export class AtividadeController {
  constructor(private readonly atividadeService: AtividadeService) {}

  @ApiOperation({ summary: 'Criar nova atividade vinculada a uma demanda' })
  @ApiResponse({ status: 201, description: 'Atividade criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Sem acesso à demanda', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Demanda não encontrada', schema: { example: { sucesso: false, dados: null, mensagem: 'Demanda não encontrada', erros: [] } } })
  @Post()
  criar(
    @Body() dto: AtividadeCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.criar(dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar atividades com filtros (executor, status, demanda, busca textual e intervalo de data). Gestor vê todas; desenvolvedor vê apenas as próprias.' })
  @ApiResponse({ status: 200, description: 'Atividades listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar(
    @Query() filtros: AtividadeListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.listar(filtros, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar atividade por ID' })
  @ApiResponse({ status: 200, description: 'Atividade recuperada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Sem acesso à demanda desta atividade', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.recuperar({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar atividade' })
  @ApiResponse({ status: 200, description: 'Atividade alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem permissão para alterar', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtividadeAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Excluir atividade via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Atividade excluída com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.atividadeService.excluir({ id });
  }

  @ApiOperation({ summary: 'Sincronizar tags da atividade (gestor ou desenvolvedor dono da atividade)' })
  @ApiResponse({ status: 200, description: 'Tags alteradas com sucesso' })
  @ApiResponse({ status: 400, description: 'Tag inexistente', schema: { example: { sucesso: false, dados: null, mensagem: 'Tag com id 99 não encontrada', erros: [] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem permissão para alterar', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id/tag')
  alterarTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtividadeTagsAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.alterarTags({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar tags da atividade' })
  @ApiResponse({ status: 200, description: 'Tags listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id/tag')
  listarTags(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadeService.listarTags({ id }, usuarioAtivo);
  }
}
