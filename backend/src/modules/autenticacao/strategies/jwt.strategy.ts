import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TipoUsuarioStatusEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    configService.obter().jwt.secreto,
    });
  }

  /**
   * A cada requisição confere que o usuário do token ainda existe e está ativo (P-031): o token dura dias,
   * e quem foi desativado ou excluído não pode continuar usando a API até ele vencer. O payload devolvido
   * leva o login e o tipo **atuais**, não os do token, então uma troca de tipo vale na hora.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Sem um id válido a consulta não filtraria por usuário nenhum: recusa antes de chegar ao repository.
    if (!Number.isInteger(payload.sub)) throw new UnauthorizedException();

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: payload.sub });

    if (!usuarioEncontrado || usuarioEncontrado.status === TipoUsuarioStatusEnum.INATIVO) {
      throw new UnauthorizedException();
    }

    return { sub: usuarioEncontrado.id, login: usuarioEncontrado.login, tipo: usuarioEncontrado.tipo };
  }
}
