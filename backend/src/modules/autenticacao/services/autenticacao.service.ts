import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { Usuario } from '../../usuario/domain/models/usuario.model';
import { AutenticacaoInternoLoginDto, AutenticacaoTokenDto } from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';
import { LimiteDeTentativasDeLogin } from '../domain/limite-de-tentativas-de-login';
import { segundosAteOCorte } from '../domain/validade-do-token';
import { ConfigService } from '../../../config/config.service';

@Injectable()
export class AutenticacaoService {
    /** Tentativas seguidas que falharam, por login e por IP (task 421): em memória, por processo. */
    private readonly limiteDeTentativas = new LimiteDeTentativasDeLogin();

    constructor(
        private readonly usuarioRepositorio: UsuarioRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    /** Valida login e senha. Retorna o usuário se válido, null se inválido. Lança exceção se inativo. */
    async validarCredenciais(login: string, senha: string): Promise<Usuario | null> {
        const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ login });

        if (!usuarioEncontrado) {
            return null;
        }

        if (!usuarioEncontrado.ativo) {
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

        // Com corte semanal o token vence nele; sem corte vale a duração do módulo (`JWT_EXPIRACAO`).
        const { jwt, aplicacao } = this.configService.obter();
        const accessToken = jwt.corteSemanal
            ? await this.jwtService.signAsync(payload, { expiresIn: segundosAteOCorte(new Date(), jwt.corteSemanal, aplicacao.fusoHorario) })
            : await this.jwtService.signAsync(payload);

        return {
            accessToken,
            tipo: 'Bearer',
            usuario: {
                id:           usuario.id,
                login:        usuario.login,
                nomeCompleto: usuario.nomeCompleto,
                tipo:         usuario.tipo,
                corAvatar:    usuario.corAvatar,
            },
        };
    }

    /**
   * Endpoint de login: valida credenciais e retorna token. Antes de conferir a senha, recusa (429) o login ou o IP com falhas demais;
   * senha errada ou login inexistente contam como falha, e o login certo zera a contagem do login (task 421).
   */
    async login(dto: AutenticacaoInternoLoginDto): Promise<StandardResponse<AutenticacaoTokenDto>> {
        const tentativa = { login: dto.login, ip: dto.ip };
        this.limiteDeTentativas.verificar(tentativa);

        const usuarioValidado = await this.validarCredenciais(dto.login, dto.senha);

        if (!usuarioValidado) {
            this.limiteDeTentativas.registrarFalha(tentativa);
            throw new BusinessException('Usuário ou senha incorretos. Confira e tente de novo.');
        }
        this.limiteDeTentativas.registrarSucesso(tentativa);

        const tokenGerado = await this.gerarToken(usuarioValidado);

        return {
            sucesso:  true,
            dados:    tokenGerado,
            mensagem: 'Login realizado com sucesso',
        };
    }
}
