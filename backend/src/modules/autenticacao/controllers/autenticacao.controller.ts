import { Controller, HttpCode, HttpStatus, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AutenticacaoService } from '../services/autenticacao.service';
import { AutenticacaoLoginDto } from '@project20/shared';
import { Public } from '../decorators/public.decorator';

@ApiTags('autenticacao')
@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  @ApiOperation({ summary: 'Login com credenciais e retorno de token JWT' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        sucesso: true,
        dados: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImxvZ2luIjoiam9hby5zaWx2YSIsInRpcG8iOiJHRVNUT1IifQ.signature',
          tipo: 'Bearer',
          usuario: {
            id: 1,
            login: 'joao.silva',
            nomeCompleto: 'João Silva',
            tipo: 'GESTOR',
          },
        },
        mensagem: 'Login realizado com sucesso',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Credenciais inválidas ou usuário inativo',
    schema: {
      example: {
        sucesso: false,
        dados: null,
        mensagem: 'Credenciais inválidas',
        erros: ['Credenciais inválidas'],
      },
    },
  })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: AutenticacaoLoginDto) {
    return this.autenticacaoService.login(dto);
  }
}
