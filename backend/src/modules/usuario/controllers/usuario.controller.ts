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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsuarioService } from '../services/usuario.service';
import {
  UsuarioCriarDto,
  UsuarioListarDto,
  UsuarioAtualizarDto,
  UsuarioSenhaAlterarDto,
} from '@project20/shared';

@ApiTags('usuario')
@ApiBearerAuth()
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @ApiOperation({ summary: 'Criar novo usuário' })
  @Post()
  criar(@Body() dto: UsuarioCriarDto) {
    return this.usuarioService.criar(dto);
  }

  @ApiOperation({ summary: 'Listar usuários com filtros e paginação' })
  @Get()
  listar(@Query() dto: UsuarioListarDto) {
    return this.usuarioService.listar(dto);
  }

  @ApiOperation({ summary: 'Recuperar usuário por ID' })
  @Get(':id')
  recuperar(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.recuperar(id);
  }

  @ApiOperation({ summary: 'Atualizar dados do usuário' })
  @Put(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioAtualizarDto) {
    return this.usuarioService.atualizar(id, dto);
  }

  @ApiOperation({ summary: 'Excluir usuário (soft delete)' })
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.excluir(id);
  }

  @ApiOperation({ summary: 'Alterar senha do usuário' })
  @Patch(':id/senha')
  alterarSenha(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioSenhaAlterarDto) {
    return this.usuarioService.alterarSenha(id, dto);
  }
}
