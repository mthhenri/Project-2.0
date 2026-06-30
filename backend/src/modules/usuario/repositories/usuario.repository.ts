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
  UsuarioAlteradoDto,
  UsuarioInternoAlterarDto,
  UsuarioValidarLoginDto,
  UsuarioSenhaInternoAlterarDto,
  UsuarioExcluirDto,
} from '@project20/shared';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';

@Injectable()
export class UsuarioRepository extends BaseRepository<Usuario> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'usuario');
  }

  /** Verifica se login já existe entre registros ativos. */
  async validarLogin(dto: UsuarioValidarLoginDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM usuario
         WHERE usuario.login = :login
           AND usuario.is_deleted = false
       ) AS existe`,
      { login: dto.login },
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
         usuario.anotacoes_alteracao_data  AS "anotacoesAlteracaoData",
         usuario.horas_diarias_necessarias AS "horasDiariasNecessarias",
         tipo_usuario.codigo               AS tipo,
         tipo_usuario_status.codigo        AS status,
         usuario.created_date              AS "createdDate",
         usuario.updated_date              AS "updatedDate",
         usuario.is_deleted                AS "isDeleted",
         usuario.deleted_date              AS "deletedDate"
       FROM usuario
       INNER JOIN tipo_usuario
         ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       INNER JOIN tipo_usuario_status
         ON tipo_usuario_status.id = usuario.tipo_usuario_status_id
         AND tipo_usuario_status.is_deleted = false
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
      condicoes.push('tipo_usuario.codigo = :tipo');
      parametros.tipo = filtros.tipo;
    }

    if (filtros.status) {
      condicoes.push('tipo_usuario_status.codigo = :status');
      parametros.status = filtros.status;
    }

    if (filtros.busca !== undefined && filtros.busca.trim() !== '') {
      condicoes.push('(usuario.nome_completo ILIKE :busca OR usuario.login ILIKE :busca)');
      parametros.busca = `%${filtros.busca.trim()}%`;
    }

    const clausulaWhere = condicoes.join(' AND ');
    const clausulasJoin = `
       INNER JOIN tipo_usuario
         ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       INNER JOIN tipo_usuario_status
         ON tipo_usuario_status.id = usuario.tipo_usuario_status_id
         AND tipo_usuario_status.is_deleted = false`;

    const resultadoTotal = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total FROM usuario ${clausulasJoin} WHERE ${clausulaWhere}`,
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
         tipo_usuario.codigo        AS tipo,
         tipo_usuario_status.codigo AS status,
         (usuario.anotacoes IS NOT NULL
            AND regexp_replace(usuario.anotacoes, '<[^>]*>|&nbsp;|&#160;|[[:space:]]+', '', 'gi') <> '') AS "temAnotacoes"
       FROM usuario
       ${clausulasJoin}
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
    tipo: TipoUsuarioEnum;
    horasDiariasNecessarias: number;
  }): Promise<UsuarioCriadoDto> {
    const resultado = await this.executarConsulta<UsuarioCriadoDto>(
      `INSERT INTO usuario (
         login, senha_encriptada, nome_completo, cargo_titulo,
         tipo_usuario_id, horas_diarias_necessarias, tipo_usuario_status_id,
         created_date, updated_date, is_deleted
       )
       SELECT
         :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo,
         (SELECT tipo_usuario.id FROM tipo_usuario
            WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false),
         :horasDiariasNecessarias,
         (SELECT tipo_usuario_status.id FROM tipo_usuario_status
            WHERE tipo_usuario_status.codigo = :status AND tipo_usuario_status.is_deleted = false),
         NOW(), NOW(), false
       RETURNING
         id,
         login,
         nome_completo             AS "nomeCompleto",
         cargo_titulo              AS "cargoTitulo",
         (SELECT tipo_usuario.codigo FROM tipo_usuario
            WHERE tipo_usuario.id = usuario.tipo_usuario_id)               AS tipo,
         (SELECT tipo_usuario_status.codigo FROM tipo_usuario_status
            WHERE tipo_usuario_status.id = usuario.tipo_usuario_status_id) AS status,
         horas_diarias_necessarias AS "horasDiariasNecessarias",
         created_date              AS "createdDate"`,
      {
        login:                   dados.login,
        senhaEncriptada:         dados.senhaEncriptada,
        nomeCompleto:            dados.nomeCompleto,
        cargoTitulo:             dados.cargoTitulo,
        tipo:                    dados.tipo,
        horasDiariasNecessarias: dados.horasDiariasNecessarias,
        status:                  TipoUsuarioStatusEnum.ATIVO,
      },
    );
    return resultado[0];
  }

  /** Altera campos do usuário. */
  async alterar(dto: UsuarioInternoAlterarDto): Promise<UsuarioAlteradoDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id: dto.id };

    if (dto.nomeCompleto !== undefined) {
      setClauses.push('nome_completo = :nomeCompleto');
      parametros.nomeCompleto = dto.nomeCompleto;
    }
    if (dto.cargoTitulo !== undefined) {
      setClauses.push('cargo_titulo = :cargoTitulo');
      parametros.cargoTitulo = dto.cargoTitulo;
    }
    if (dto.anotacoes !== undefined) {
      setClauses.push('anotacoes = :anotacoes');
      setClauses.push(
        'anotacoes_alteracao_data = CASE WHEN anotacoes IS DISTINCT FROM :anotacoes THEN NOW() ELSE anotacoes_alteracao_data END',
      );
      parametros.anotacoes = dto.anotacoes;
    }
    if (dto.horasDiariasNecessarias !== undefined) {
      setClauses.push('horas_diarias_necessarias = :horasDiariasNecessarias');
      parametros.horasDiariasNecessarias = dto.horasDiariasNecessarias;
    }
    if (dto.status !== undefined) {
      setClauses.push(
        'tipo_usuario_status_id = (SELECT tipo_usuario_status.id FROM tipo_usuario_status WHERE tipo_usuario_status.codigo = :status AND tipo_usuario_status.is_deleted = false)',
      );
      parametros.status = dto.status;
    }
    if (dto.tipo !== undefined) {
      setClauses.push(
        'tipo_usuario_id = (SELECT tipo_usuario.id FROM tipo_usuario WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false)',
      );
      parametros.tipo = dto.tipo;
    }

    const resultado = await this.executarConsulta<UsuarioAlteradoDto>(
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
         anotacoes_alteracao_data  AS "anotacoesAlteracaoData",
         (SELECT tipo_usuario.codigo FROM tipo_usuario
            WHERE tipo_usuario.id = usuario.tipo_usuario_id)               AS tipo,
         (SELECT tipo_usuario_status.codigo FROM tipo_usuario_status
            WHERE tipo_usuario_status.id = usuario.tipo_usuario_status_id) AS status,
         horas_diarias_necessarias AS "horasDiariasNecessarias",
         created_date              AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Altera apenas a senha encriptada. */
  async alterarSenha(dto: UsuarioSenhaInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE usuario
       SET senha_encriptada = :senhaEncriptada,
           updated_date = NOW()
       WHERE usuario.id = :id
         AND usuario.is_deleted = false`,
      { id: dto.id, senhaEncriptada: dto.senhaEncriptada },
    );
  }

  /** Soft delete do usuário. */
  async excluir(dto: UsuarioExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Lista todos os usuários ativos com a meta diária — usado pelo módulo de ponto
   * para montar o resumo diário de cada usuário na visão "todos hoje".
   */
  async listarAtivosComMeta(): Promise<
    { id: number; nomeCompleto: string; horasDiariasNecessarias: number }[]
  > {
    return this.executarConsulta<{
      id: number;
      nomeCompleto: string;
      horasDiariasNecessarias: number;
    }>(
      `SELECT
         usuario.id,
         usuario.nome_completo             AS "nomeCompleto",
         usuario.horas_diarias_necessarias AS "horasDiariasNecessarias"
       FROM usuario
       WHERE usuario.tipo_usuario_status_id = (
               SELECT tipo_usuario_status.id FROM tipo_usuario_status
               WHERE tipo_usuario_status.codigo = :status AND tipo_usuario_status.is_deleted = false
             )
         AND usuario.is_deleted = false
       ORDER BY usuario.nome_completo ASC`,
      { status: TipoUsuarioStatusEnum.ATIVO },
    );
  }

  /** Lista todos os gestores ativos (usado na auto-atribuição de demandas). */
  async listarGestoresAtivos(): Promise<{ id: number }[]> {
    return this.executarConsulta<{ id: number }>(
      `SELECT usuario.id
       FROM usuario
       WHERE usuario.tipo_usuario_id = (
               SELECT tipo_usuario.id FROM tipo_usuario
               WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false
             )
         AND usuario.tipo_usuario_status_id = (
               SELECT tipo_usuario_status.id FROM tipo_usuario_status
               WHERE tipo_usuario_status.codigo = :status AND tipo_usuario_status.is_deleted = false
             )
         AND usuario.is_deleted = false`,
      { tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO },
    );
  }
}
