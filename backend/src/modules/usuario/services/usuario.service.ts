import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { Usuario } from '../domain/models/usuario.model';
import {
  UsuarioCriarDto,
  UsuarioCriadoDto,
  UsuarioListarDto,
  UsuarioResumoDto,
  UsuarioRecuperadoDto,
  UsuarioRecuperarDto,
  UsuarioInternoAlterarDto,
  UsuarioAlteradoDto,
  UsuarioExcluirDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
  TipoUsuarioEnum,
} from '@project20/shared';
import { StandardResponse, PaginatedResult } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class UsuarioService {
  constructor(private readonly usuarioRepositorio: UsuarioRepository) {}

  /** Cria novo usuário validando unicidade do login e encriptando a senha. */
  async criar(dto: UsuarioCriarDto): Promise<StandardResponse<UsuarioCriadoDto>> {
    const loginJaExiste = await this.usuarioRepositorio.validarLogin({ login: dto.login });

    if (loginJaExiste) {
      throw new BusinessException('Login já está em uso');
    }

    const senhaEncriptada = await bcrypt.hash(dto.senhaNaoEncriptada, 10);

    const usuarioCriado = await this.usuarioRepositorio.inserir({
      login:                   dto.login,
      senhaEncriptada,
      nomeCompleto:            dto.nomeCompleto,
      cargoTitulo:             dto.cargoTitulo,
      tipo:                    dto.tipo,
      horasDiariasNecessarias: dto.horasDiariasNecessarias,
    });

    return {
      sucesso:  true,
      dados:    usuarioCriado,
      mensagem: 'Usuário criado com sucesso',
    };
  }

  /** Lista usuários com filtros opcionais e paginação. */
  async listar(filtros: UsuarioListarDto): Promise<StandardResponse<PaginatedResult<UsuarioResumoDto>>> {
    const { itens, total } = await this.usuarioRepositorio.listar(filtros);

    if (filtros.allRows) {
      return {
        sucesso:  true,
        dados: {
          itens,
          totalItens:     itens.length,
          paginaAtual:    1,
          itensPorPagina: itens.length,
          totalPaginas:   1,
        },
        mensagem: 'Usuários listados com sucesso',
      };
    }

    const paginaAtual = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const totalPaginas = Math.ceil(total / itensPorPagina);

    return {
      sucesso:  true,
      dados: {
        itens,
        totalItens:    total,
        paginaAtual,
        itensPorPagina,
        totalPaginas,
      },
      mensagem: 'Usuários listados com sucesso',
    };
  }

  /** Recupera usuário por ID. Desenvolvedor só pode ver o próprio perfil. */
  async recuperar(dto: UsuarioRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioRecuperadoDto>> {
    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && usuarioAtivo.sub !== dto.id) {
      throw new UnauthorizedAccessException('Desenvolvedor pode acessar apenas o próprio perfil');
    }

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    return {
      sucesso:  true,
      dados:    this.mapearParaRecuperado(usuarioEncontrado),
      mensagem: 'Usuário recuperado com sucesso',
    };
  }

  /** Altera campos do usuário. Desenvolvedor só pode alterar o próprio perfil. */
  async alterar(dto: UsuarioInternoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioAlteradoDto>> {
    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && usuarioAtivo.sub !== dto.id) {
      throw new UnauthorizedAccessException('Desenvolvedor pode alterar apenas o próprio perfil');
    }

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && dto.tipo !== undefined) {
      throw new UnauthorizedAccessException('Apenas gestores podem alterar o tipo de usuário');
    }

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const estaRebaixandoGestor =
      usuarioEncontrado.tipo === TipoUsuarioEnum.GESTOR &&
      dto.tipo === TipoUsuarioEnum.DESENVOLVEDOR;

    if (estaRebaixandoGestor) {
      if (usuarioAtivo.sub === dto.id) {
        throw new BusinessException('Um gestor não pode rebaixar a si mesmo');
      }

      const gestoresAtivos = await this.usuarioRepositorio.listarGestoresAtivos();
      const outrosGestoresAtivos = gestoresAtivos.filter((gestor) => gestor.id !== dto.id);
      if (outrosGestoresAtivos.length === 0) {
        throw new BusinessException('O sistema deve ter ao menos um gestor ativo');
      }
    }

    const usuarioAlterado = await this.usuarioRepositorio.alterar(dto);

    return {
      sucesso:  true,
      dados:    usuarioAlterado,
      mensagem: 'Usuário alterado com sucesso',
    };
  }

  /** Realiza soft delete do usuário. Lança exceção se não encontrado. */
  async excluir(dto: UsuarioExcluirDto): Promise<StandardResponse<void>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    await this.usuarioRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Usuário excluído com sucesso',
    };
  }

  async alterarSenha(dto: UsuarioSenhaAlterarDto & { id: number }): Promise<StandardResponse<UsuarioSenhaAlteradaDto>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const novaSenhaEncriptada = await bcrypt.hash(dto.senhaNova, 10);
    await this.usuarioRepositorio.alterarSenha({ id: dto.id, senhaEncriptada: novaSenhaEncriptada });

    return {
      sucesso:  true,
      dados:    { mensagem: 'Senha alterada com sucesso' },
      mensagem: 'Senha alterada com sucesso',
    };
  }

  private mapearParaRecuperado(usuario: Usuario): UsuarioRecuperadoDto {
    return {
      id:                      usuario.id,
      login:                   usuario.login,
      nomeCompleto:            usuario.nomeCompleto,
      cargoTitulo:             usuario.cargoTitulo,
      anotacoes:               usuario.anotacoes,
      anotacoesAlteracaoData:  usuario.anotacoesAlteracaoData,
      tipo:                    usuario.tipo,
      status:                  usuario.status,
      horasDiariasNecessarias: usuario.horasDiariasNecessarias,
      createdDate:             usuario.createdDate,
    };
  }
}
