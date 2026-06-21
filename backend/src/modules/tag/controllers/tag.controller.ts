import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TagService } from '../services/tag.service';
import { TagCriarDto, TagAlterarDto } from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';

const TAG_EXEMPLO = { id: 1, nome: 'Backend', cor: '#6366f1', createdDate: '2026-06-13T12:00:00.000Z' };

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: ['Acesso não autorizado'] };

const NAO_ENCONTRADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Tag não encontrado', erros: ['Tag não encontrado'] };

@ApiTags('tag')
@ApiBearerAuth()
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @ApiOperation({ summary: 'Criar nova tag (somente gestor)' })
  @ApiResponse({ status: 201, description: 'Tag criada com sucesso', schema: { example: { sucesso: true, dados: TAG_EXEMPLO, mensagem: 'Tag criada com sucesso' } } })
  @ApiResponse({ status: 400, description: 'Nome já em uso ou dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'Já existe uma tag com esse nome', erros: ['Já existe uma tag com esse nome'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Post()
  criar(@Body() dto: TagCriarDto) {
    return this.tagService.criar(dto);
  }

  @ApiOperation({ summary: 'Listar todas as tags (qualquer autenticado)' })
  @ApiResponse({ status: 200, description: 'Tags listadas com sucesso', schema: { example: { sucesso: true, dados: [{ id: 1, nome: 'Backend', cor: '#6366f1' }, { id: 2, nome: 'Frontend', cor: '#f59e0b' }], mensagem: 'Tags listadas com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar() {
    return this.tagService.listar();
  }

  @ApiOperation({ summary: 'Recuperar tag por ID (qualquer autenticado)' })
  @ApiResponse({ status: 200, description: 'Tag recuperada com sucesso', schema: { example: { sucesso: true, dados: TAG_EXEMPLO, mensagem: 'Tag recuperada com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Tag não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.recuperar({ id });
  }

  @ApiOperation({ summary: 'Alterar tag (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Tag alterada com sucesso', schema: { example: { sucesso: true, dados: { ...TAG_EXEMPLO, nome: 'Frontend' }, mensagem: 'Tag alterada com sucesso' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou nome já em uso', schema: { example: { sucesso: false, dados: null, mensagem: 'Já existe uma tag com esse nome', erros: ['Já existe uma tag com esse nome'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Tag não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TagAlterarDto,
  ) {
    return this.tagService.alterar({ ...dto, id });
  }

  @ApiOperation({ summary: 'Excluir tag via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Tag excluída com sucesso', schema: { example: { sucesso: true, dados: null, mensagem: 'Tag excluída com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Tag não encontrada', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.excluir({ id });
  }
}
