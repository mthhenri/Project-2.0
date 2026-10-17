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
  temPermissaoDeAdministrador,
  temPermissaoDeGestor,
  TipoUsuarioStatusEnum,
} from '@project20/shared';
import { StandardResponse, PaginatedResult } from '@project20/shared';
import { UsuarioRestaurarDto, UsuarioRestauradoDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class UsuarioService {
  constructor(private readonly usuarioRepositorio: UsuarioRepository) {}

  /** Cria novo usuário validando unicidade do login e encriptando a senha. */
  async criar(dto: UsuarioCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioCriadoDto>> {
    if (dto.tipo === TipoUsuarioEnum.ADMINISTRADOR) {
      this.validarPermissaoDeAdministrador(usuarioAtivo);
    }

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

  /** Altera campos do usuário. Só gestor e administrador alteram usuários (o desenvolvedor nem o próprio perfil; o pad tem rota própria). */
  async alterar(dto: UsuarioInternoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioAlteradoDto>> {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas gestores podem alterar usuários');
    }

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    this.validarPermissaoSobreAdministrador(usuarioEncontrado, usuarioAtivo);
    if (dto.tipo === TipoUsuarioEnum.ADMINISTRADOR) {
      this.validarPermissaoDeAdministrador(usuarioAtivo);
    }

    const estaRebaixandoGestor =
      usuarioEncontrado.tipo === TipoUsuarioEnum.GESTOR &&
      dto.tipo === TipoUsuarioEnum.DESENVOLVEDOR;

    if (estaRebaixandoGestor) {
      if (usuarioAtivo.sub === dto.id) {
        throw new BusinessException('Um gestor não pode rebaixar a si mesmo');
      }

    }

    const deixaDeSerAdministrador = dto.tipo !== undefined && !temPermissaoDeAdministrador(dto.tipo);
    const deixaDeSerAtivo = dto.status !== undefined && dto.status !== TipoUsuarioStatusEnum.ATIVO;
    if (deixaDeSerAdministrador || deixaDeSerAtivo) {
      await this.validarPermanenciaDeAdministradorAtivo(usuarioEncontrado);
    }

    const usuarioAlterado = await this.usuarioRepositorio.alterar(dto);

    return {
      sucesso:  true,
      dados:    usuarioAlterado,
      mensagem: 'Usuário alterado com sucesso',
    };
  }

  /**
   * O sistema precisa de ao menos um administrador ativo: quem tira um administrador ativo de cena
   * (rebaixar, inativar ou excluir) só pode fazê-lo se existir outro. Usuário que não é administrador
   * ativo não muda esse número; gestor deixa de ser obrigatório, porque o administrador já é um gestor.
   */
  private async validarPermanenciaDeAdministradorAtivo(usuario: Usuario): Promise<void> {
    if (!temPermissaoDeAdministrador(usuario.tipo) || usuario.status !== TipoUsuarioStatusEnum.ATIVO) return;

    const administradoresAtivos = await this.usuarioRepositorio.listarAdministradoresAtivos();
    const outrosAdministradoresAtivos = administradoresAtivos.filter((administrador) => administrador.id !== usuario.id);
    if (outrosAdministradoresAtivos.length === 0) {
      throw new BusinessException('O sistema deve ter ao menos um administrador ativo');
    }
  }

  /** Criar ou promover administrador é exclusivo de administrador. */
  private validarPermissaoDeAdministrador(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas administradores podem criar ou promover administradores');
    }
  }

  /** Gestor não altera, inativa, exclui, restaura nem troca a senha de um administrador. */
  private validarPermissaoSobreAdministrador(alvo: { tipo: TipoUsuarioEnum }, usuarioAtivo: JwtPayload): void {
    if (temPermissaoDeAdministrador(alvo.tipo) && !temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas administradores podem gerenciar administradores');
    }
  }

  /** Realiza soft delete do usuário. Lança exceção se não encontrado. */
  async excluir(dto: UsuarioExcluirDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    this.validarPermissaoSobreAdministrador(usuarioEncontrado, usuarioAtivo);
    await this.validarPermanenciaDeAdministradorAtivo(usuarioEncontrado);

    await this.usuarioRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Usuário excluído com sucesso',
    };
  }

  /** Restaura o usuário excluído (soft delete revertido, sem cascata). Restrito a gestores. */
  async restaurar(dto: UsuarioRestaurarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioRestauradoDto>> {
    const usuarioExcluido = await this.usuarioRepositorio.recuperarExcluido({ id: dto.id });
    if (!usuarioExcluido) {
      throw new ResourceNotFoundException('Usuário');
    }

    this.validarPermissaoSobreAdministrador(usuarioExcluido, usuarioAtivo);

    const loginJaExiste = await this.usuarioRepositorio.validarLogin({ login: usuarioExcluido.login });
    if (loginJaExiste) {
      throw new BusinessException(`Já existe um usuário ativo com o login "${usuarioExcluido.login}"`);
    }

    const usuarioRestaurado = await this.usuarioRepositorio.restaurar({ id: dto.id });

    return {
      sucesso:  true,
      dados:    usuarioRestaurado,
      mensagem: 'Usuário restaurado com sucesso',
    };
  }

  async alterarSenha(dto: UsuarioSenhaAlterarDto & { id: number }, usuarioAtivo: JwtPayload): Promise<StandardResponse<UsuarioSenhaAlteradaDto>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    this.validarPermissaoSobreAdministrador(usuarioEncontrado, usuarioAtivo);

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
      tipo:                    usuario.tipo,
      status:                  usuario.status,
      horasDiariasNecessarias: usuario.horasDiariasNecessarias,
      createdDate:             usuario.createdDate,
    };
  }
}
