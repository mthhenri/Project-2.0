import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsuarioService } from '../services/usuario.service';
import {
  UsuarioCriarDto,
  UsuarioListarDto,
  UsuarioAlterarDto,
  UsuarioSenhaAlterarDto,
} from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

const USUARIO_EXEMPLO = {
  id: 1,
  login: 'joao.silva',
  nomeCompleto: 'João Silva',
  cargoTitulo: 'Desenvolvedor Sênior',
  anotacoes: null,
  tipo: 'DESENVOLVEDOR',
  status: 'ATIVO',
  horasDiariasNecessarias: 8,
  createdDate: '2026-06-13T12:00:00.000Z',
};

const NAO_AUTORIZADO_EXEMPLO = {
  sucesso: false,
  dados: null,
  mensagem: 'Acesso não autorizado',
  erros: ['Acesso não autorizado'],
};

const NAO_ENCONTRADO_EXEMPLO = {
  sucesso: false,
  dados: null,
  mensagem: 'Usuário não encontrado',
  erros: ['Usuário não encontrado'],
};

@ApiTags('usuario')
@ApiBearerAuth()
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @ApiOperation({ summary: 'Criar novo usuário (somente gestor)' })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: { ...USUARIO_EXEMPLO, anotacoes: undefined },
        mensagem: 'Usuário criado com sucesso',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou login já em uso', schema: { example: { sucesso: false, dados: null, mensagem: 'Login já está em uso', erros: ['Login já está em uso'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Post()
  criar(@Body() dto: UsuarioCriarDto) {
    return this.usuarioService.criar(dto);
  }

  @ApiOperation({ summary: 'Listar usuários com filtros e paginação (somente gestor)' })
  @ApiResponse({
    status: 200,
    description: 'Usuários listados com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: {
          itens: [
            { id: 1, login: 'joao.silva', nomeCompleto: 'João Silva', cargoTitulo: 'Desenvolvedor Sênior', tipo: 'DESENVOLVEDOR', status: 'ATIVO' },
            { id: 2, login: 'maria.gestora', nomeCompleto: 'Maria Gestora', cargoTitulo: 'Gerente de Projetos', tipo: 'GESTOR', status: 'ATIVO' },
          ],
          totalItens: 2,
          paginaAtual: 1,
          itensPorPagina: 20,
          totalPaginas: 1,
        },
        mensagem: 'Usuários listados com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Get()
  listar(@Query() dto: UsuarioListarDto) {
    return this.usuarioService.listar(dto);
  }

  @ApiOperation({ summary: 'Recuperar usuário por ID (desenvolvedor acessa apenas o próprio perfil)' })
  @ApiResponse({
    status: 200,
    description: 'Usuário recuperado com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: USUARIO_EXEMPLO,
        mensagem: 'Usuário recuperado com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor tentando acessar perfil de outro usuário', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.usuarioService.recuperar({ id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Alterar dados do usuário (desenvolvedor altera apenas o próprio perfil)' })
  @ApiResponse({
    status: 200,
    description: 'Usuário alterado com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: { ...USUARIO_EXEMPLO, cargoTitulo: 'Tech Lead' },
        mensagem: 'Usuário alterado com sucesso',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'Validation failed', erros: ['nomeCompleto must be longer than or equal to 3 characters'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Desenvolvedor tentando alterar perfil de outro usuário', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.usuarioService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @ApiOperation({ summary: 'Excluir usuário via soft delete (somente gestor)' })
  @ApiResponse({
    status: 200,
    description: 'Usuário excluído com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: null,
        mensagem: 'Usuário excluído com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.excluir({ id });
  }

  @ApiOperation({ summary: 'Alterar senha do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: { mensagem: 'Senha alterada com sucesso' },
        mensagem: 'Senha alterada com sucesso',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta ou dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'Senha atual incorreta', erros: ['Senha atual incorreta'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Patch(':id/senha')
  alterarSenha(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioSenhaAlterarDto) {
    return this.usuarioService.alterarSenha({ ...dto, id });
  }
}
