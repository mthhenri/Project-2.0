import { Injectable } from '@nestjs/common';
import { TipoUsuarioStatusEnum, UsuariosListadosDto, UsuariosListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { UsuarioService } from '../services/usuario.service';

/** Quantos usuários voltam de uma vez à IA. */
export const LIMITE_USUARIOS_DA_FERRAMENTA = 50;

/**
 * Os usuários ativos, só para o gestor (o registro esconde a ferramenta dos demais). Devolve nome, login, cargo e tipo: nada de senha,
 * horas de meta nem anotações. Serve para achar o `usuarioId` das outras ferramentas.
 */
@Injectable()
export class ListarUsuariosFerramenta extends FerramentaIa<UsuariosListarDto> {
  readonly nome = 'listar_usuarios';
  readonly descricao =
    'Lista os usuários ativos da equipe, com id, nome, login, cargo e tipo; filtre por `tipo` ou por `busca` (parte do nome ou do login). ' +
    'Use para achar o usuarioId de alguém antes de consultar o ponto dele ou perguntar quem está na equipe.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = UsuariosListarDto;

  constructor(private readonly usuarioService: UsuarioService) {
    super();
  }

  async executar(entrada: UsuariosListarDto, _usuarioAtivo: JwtPayload): Promise<UsuariosListadosDto> {
    const itens =
      (await this.usuarioService.listar({ tipo: entrada.tipo, busca: entrada.busca, status: TipoUsuarioStatusEnum.ATIVO, allRows: true })).dados?.itens ?? [];
    return {
      usuarios: itens
        .slice(0, LIMITE_USUARIOS_DA_FERRAMENTA)
        .map((usuario) => ({ id: usuario.id, nome: usuario.nomeCompleto, login: usuario.login, cargo: usuario.cargoTitulo, tipo: usuario.tipo })),
      total: itens.length,
      haMais: itens.length > LIMITE_USUARIOS_DA_FERRAMENTA,
    };
  }
}
