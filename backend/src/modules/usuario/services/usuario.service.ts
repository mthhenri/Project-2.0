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
  UsuarioAtualizarDto,
  UsuarioAtualizadoDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
} from '@project20/shared';
import { StandardResponse, PaginatedResult } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

@Injectable()
export class UsuarioService {
  constructor(private readonly usuarioRepositorio: UsuarioRepository) {}

  /** Cria novo usuário validando unicidade do login e encriptando a senha. */
  async criar(dto: UsuarioCriarDto): Promise<StandardResponse<UsuarioCriadoDto>> {
    const loginJaExiste = await this.usuarioRepositorio.existeLogin(dto.login);

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

  /** Recupera usuário por ID. Lança exceção se não encontrado. */
  async recuperar(id: number): Promise<StandardResponse<UsuarioRecuperadoDto>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    return {
      sucesso:  true,
      dados:    this.mapearParaRecuperado(usuarioEncontrado),
      mensagem: 'Usuário recuperado com sucesso',
    };
  }

  /** Atualiza campos do usuário. Lança exceção se não encontrado. */
  async atualizar(id: number, dto: UsuarioAtualizarDto): Promise<StandardResponse<UsuarioAtualizadoDto>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const usuarioAtualizado = await this.usuarioRepositorio.atualizar(id, dto);

    return {
      sucesso:  true,
      dados:    usuarioAtualizado,
      mensagem: 'Usuário atualizado com sucesso',
    };
  }

  /** Realiza soft delete do usuário. Lança exceção se não encontrado. */
  async excluir(id: number): Promise<StandardResponse<void>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    await this.usuarioRepositorio.excluir(id);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Usuário excluído com sucesso',
    };
  }

  /** Altera senha validando a senha atual com bcrypt. */
  async alterarSenha(id: number, dto: UsuarioSenhaAlterarDto): Promise<StandardResponse<UsuarioSenhaAlteradaDto>> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id });

    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const senhaEstaCorreta = await bcrypt.compare(dto.senhaAtual, usuarioEncontrado.senhaEncriptada);

    if (!senhaEstaCorreta) {
      throw new BusinessException('Senha atual incorreta');
    }

    const novaSenhaEncriptada = await bcrypt.hash(dto.senhaNova, 10);
    await this.usuarioRepositorio.atualizarSenha(id, novaSenhaEncriptada);

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
      tipo:                    usuario.tipo,
      status:                  usuario.status,
      horasDiariasNecessarias: usuario.horasDiariasNecessarias,
      createdDate:             usuario.createdDate,
    };
  }
}
