import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Usuario } from '../domain/models/usuario.model';
import {
  UsuarioCriadoDto,
  UsuarioRecuperadoDto,
  UsuarioRecuperarDto,
  UsuarioResumoDto,
  UsuarioListarDto,
  UsuarioAtualizadoDto,
} from '@project20/shared';
import { UsuarioTipoEnum, UsuarioStatusEnum } from '@project20/shared';

@Injectable()
export class UsuarioRepository extends BaseRepository<Usuario> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'usuario');
  }

  /** Verifica se login já existe entre registros ativos. */
  async existeLogin(login: string): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM usuario
         WHERE usuario.login = :login
           AND usuario.is_deleted = false
       ) AS existe`,
      { login },
    );
    return resultado[0].existe;
  }

  /**
   * Recupera um usuário por id ou login (inclui senha encriptada).
   * Retorna null se não encontrado ou deletado.
   */
  async recuperar(dto: UsuarioRecuperarDto): Promise<Usuario | null> {
    const condicoes: string[] = ['usuario.is_deleted = false'];
    const parametros: Record<string, unknown> = {};

    if (dto.id !== undefined) {
      condicoes.push('usuario.id = :id');
      parametros.id = dto.id;
    }

    if (dto.login !== undefined) {
      condicoes.push('usuario.login = :login');
      parametros.login = dto.login;
    }

    const resultado = await this.executarConsulta<Usuario>(
      `SELECT
         usuario.id,
         usuario.login,
         usuario.senha_encriptada          AS "senhaEncriptada",
         usuario.nome_completo             AS "nomeCompleto",
         usuario.cargo_titulo              AS "cargoTitulo",
         usuario.anotacoes,
         usuario.horas_diarias_necessarias AS "horasDiariasNecessarias",
         usuario.tipo,
         usuario.status,
         usuario.created_date              AS "createdDate",
         usuario.updated_date              AS "updatedDate",
         usuario.is_deleted                AS "isDeleted",
         usuario.deleted_date              AS "deletedDate"
       FROM usuario
       WHERE ${condicoes.join(' AND ')}
       LIMIT 1`,
      parametros,
    );

    return resultado[0] ?? null;
  }

  /** Lista usuários com filtros e paginação. */
  async listar(filtros: UsuarioListarDto): Promise<{ itens: UsuarioResumoDto[]; total: number }> {
    const pagina = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    const condicoes: string[] = ['usuario.is_deleted = false'];
    const parametros: Record<string, unknown> = {};

    if (filtros.tipo) {
      condicoes.push('usuario.tipo = :tipo');
      parametros.tipo = filtros.tipo;
    }

    if (filtros.status) {
      condicoes.push('usuario.status = :status');
      parametros.status = filtros.status;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const resultadoTotal = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total FROM usuario WHERE ${clausulaWhere}`,
      parametros,
    );

    const total = parseInt(resultadoTotal[0].total, 10);
    const deslocamento = (pagina - 1) * itensPorPagina;

    const itens = await this.executarConsulta<UsuarioResumoDto>(
      `SELECT
         usuario.id,
         usuario.login,
         usuario.nome_completo AS "nomeCompleto",
         usuario.cargo_titulo  AS "cargoTitulo",
         usuario.tipo,
         usuario.status
       FROM usuario
       WHERE ${clausulaWhere}
       ORDER BY usuario.nome_completo ASC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
  }

  /** Insere novo usuário. Recebe senha já encriptada. Status inicial sempre ATIVO. */
  async inserir(dados: {
    login: string;
    senhaEncriptada: string;
    nomeCompleto: string;
    cargoTitulo: string;
    tipo: UsuarioTipoEnum;
    horasDiariasNecessarias: number;
  }): Promise<UsuarioCriadoDto> {
    const resultado = await this.executarConsulta<UsuarioCriadoDto>(
      `INSERT INTO usuario (
         login, senha_encriptada, nome_completo, cargo_titulo,
         tipo, horas_diarias_necessarias, status,
         created_date, updated_date, is_deleted
       )
       SELECT
         :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo,
         :tipo, :horasDiariasNecessarias, :status,
         NOW(), NOW(), false
       RETURNING
         id,
         login,
         nome_completo             AS "nomeCompleto",
         cargo_titulo              AS "cargoTitulo",
         tipo,
         status,
         horas_diarias_necessarias AS "horasDiariasNecessarias",
         created_date              AS "createdDate"`,
      {
        login:                   dados.login,
        senhaEncriptada:         dados.senhaEncriptada,
        nomeCompleto:            dados.nomeCompleto,
        cargoTitulo:             dados.cargoTitulo,
        tipo:                    dados.tipo,
        horasDiariasNecessarias: dados.horasDiariasNecessarias,
        status:                  UsuarioStatusEnum.ATIVO,
      },
    );
    return resultado[0];
  }

  /** Atualiza campos do usuário. */
  async atualizar(id: number, dados: {
    nomeCompleto?: string;
    cargoTitulo?: string;
    anotacoes?: string;
    horasDiariasNecessarias?: number;
    status?: UsuarioStatusEnum;
  }): Promise<UsuarioAtualizadoDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id };

    if (dados.nomeCompleto !== undefined) {
      setClauses.push('nome_completo = :nomeCompleto');
      parametros.nomeCompleto = dados.nomeCompleto;
    }
    if (dados.cargoTitulo !== undefined) {
      setClauses.push('cargo_titulo = :cargoTitulo');
      parametros.cargoTitulo = dados.cargoTitulo;
    }
    if (dados.anotacoes !== undefined) {
      setClauses.push('anotacoes = :anotacoes');
      parametros.anotacoes = dados.anotacoes;
    }
    if (dados.horasDiariasNecessarias !== undefined) {
      setClauses.push('horas_diarias_necessarias = :horasDiariasNecessarias');
      parametros.horasDiariasNecessarias = dados.horasDiariasNecessarias;
    }
    if (dados.status !== undefined) {
      setClauses.push('status = :status');
      parametros.status = dados.status;
    }

    const resultado = await this.executarConsulta<UsuarioAtualizadoDto>(
      `UPDATE usuario
       SET ${setClauses.join(', ')}
       WHERE usuario.id = :id
         AND usuario.is_deleted = false
       RETURNING
         id,
         login,
         nome_completo             AS "nomeCompleto",
         cargo_titulo              AS "cargoTitulo",
         anotacoes,
         tipo,
         status,
         horas_diarias_necessarias AS "horasDiariasNecessarias",
         created_date              AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Atualiza apenas a senha encriptada. */
  async atualizarSenha(id: number, senhaEncriptada: string): Promise<void> {
    await this.executarComando(
      `UPDATE usuario
       SET senha_encriptada = :senhaEncriptada,
           updated_date = NOW()
       WHERE usuario.id = :id
         AND usuario.is_deleted = false`,
      { id, senhaEncriptada },
    );
  }

  /** Soft delete do usuário. */
  async excluir(id: number): Promise<void> {
    await this.executarSoftDelete(id);
  }

  /** Lista todos os gestores ativos (usado na auto-atribuição de demandas). */
  async listarGestoresAtivos(): Promise<{ id: number }[]> {
    return this.executarConsulta<{ id: number }>(
      `SELECT usuario.id
       FROM usuario
       WHERE usuario.tipo = :tipo
         AND usuario.status = :status
         AND usuario.is_deleted = false`,
      { tipo: UsuarioTipoEnum.GESTOR, status: UsuarioStatusEnum.ATIVO },
    );
  }
}
