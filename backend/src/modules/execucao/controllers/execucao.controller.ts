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
import { ExecucaoService } from '../services/execucao.service';
import {
  ExecucaoIniciarDto,
  ExecucaoEncerrarDto,
  ExecucaoListarDto,
  ExecucaoAlterarDto,
  ExecucaoRegistrarDto,
} from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: [] };
const NAO_ENCONTRADO_EXEMPLO  = { sucesso: false, dados: null, mensagem: 'Execução não encontrada', erros: [] };

@ApiTags('execucao')
@ApiBearerAuth()
@Controller('execucao')
export class ExecucaoController {
  constructor(private readonly execucaoService: ExecucaoService) {}

  @ApiOperation({ summary: 'Iniciar nova execução de tempo em uma atividade' })
  @ApiResponse({ status: 201, description: 'Execução iniciada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou execução já em andamento' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Sem acesso à demanda da atividade', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: { sucesso: false, dados: null, mensagem: 'Atividade não encontrada', erros: [] } } })
  @Post()
  iniciar(
    @Body() dto: ExecucaoIniciarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.iniciar(dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Registrar execução manual já encerrada para o dono da atividade (somente gestor)' })
  @ApiResponse({ status: 201, description: 'Execução registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Datas inválidas ou sobreposição com outra execução' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada', schema: { example: { sucesso: false, dados: null, mensagem: 'Atividade não encontrada', erros: [] } } })
  @GestorOnly()
  @Post('registro')
  registrar(
    @Body() dto: ExecucaoRegistrarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.registrar(dto, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Listar execuções com filtros opcionais' })
  @ApiResponse({ status: 200, description: 'Execuções listadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar(
    @Query() filtros: ExecucaoListarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.listar(filtros, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar a execução ativa do usuário autenticado (ou null)' })
  @ApiResponse({ status: 200, description: 'Execução ativa recuperada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get('ativa')
  recuperarAtiva(@ActiveUser() usuarioAtivo: JwtPayload) {
    return this.execucaoService.recuperarAtiva(usuarioAtivo);
  }

  @ApiOperation({ summary: 'Recuperar execução por ID' })
  @ApiResponse({ status: 200, description: 'Execução recuperada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem acesso à execução de outro usuário', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Execução não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.recuperar({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Encerrar execução em andamento' })
  @ApiResponse({ status: 200, description: 'Execução encerrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Execução já encerrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem permissão para encerrar execução de outro usuário', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Execução não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Patch(':id/encerrar')
  encerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExecucaoEncerrarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.encerrar({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar descrição de uma execução' })
  @ApiResponse({ status: 200, description: 'Execução alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor sem permissão para editar execução de outro usuário', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Execução não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExecucaoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Excluir execução via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Execução excluída com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Execução não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.execucaoService.excluir({ id }, usuarioAtivo);
  }
}
