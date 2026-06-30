import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { Usuario } from '../../usuario/domain/models/usuario.model';
import { TipoUsuarioStatusEnum } from '@project20/shared';
import { AutenticacaoLoginDto, AutenticacaoTokenDto } from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';

@Injectable()
export class AutenticacaoService {
  constructor(
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly jwtService: JwtService,
  ) {}

  /** Valida login e senha. Retorna o usuário se válido, null se inválido. Lança exceção se inativo. */
  async validarCredenciais(login: string, senha: string): Promise<Usuario | null> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ login });

    if (!usuarioEncontrado) {
      return null;
    }

    if (usuarioEncontrado.status === TipoUsuarioStatusEnum.INATIVO) {
      throw new BusinessException('Usuário inativo');
    }

    const senhaEstaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senhaEncriptada);

    if (!senhaEstaCorreta) {
      return null;
    }

    return usuarioEncontrado;
  }

  /** Gera token JWT para o usuário validado. */
  async gerarToken(usuario: Usuario): Promise<AutenticacaoTokenDto> {
    const payload: JwtPayload = {
      sub:   usuario.id,
      login: usuario.login,
      tipo:  usuario.tipo,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tipo: 'Bearer',
      usuario: {
        id:           usuario.id,
        login:        usuario.login,
        nomeCompleto: usuario.nomeCompleto,
        tipo:         usuario.tipo,
      },
    };
  }

  /** Endpoint de login: valida credenciais e retorna token. */
  async login(dto: AutenticacaoLoginDto): Promise<StandardResponse<AutenticacaoTokenDto>> {
    const usuarioValidado = await this.validarCredenciais(dto.login, dto.senha);

    if (!usuarioValidado) {
      throw new BusinessException('Credenciais inválidas');
    }

    const tokenGerado = await this.gerarToken(usuarioValidado);

    return {
      sucesso:  true,
      dados:    tokenGerado,
      mensagem: 'Login realizado com sucesso',
    };
  }
}
