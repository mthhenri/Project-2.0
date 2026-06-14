import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Execucao } from '../domain/models/execucao.model';
import {
  ExecucaoIniciadaDto,
  ExecucaoEncerradaDto,
  ExecucaoAlteradaDto,
  ExecucaoListarDto,
  ExecucaoResumoDto,
} from '@project20/shared';

@Injectable()
export class ExecucaoRepository extends BaseRepository<Execucao> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'execucao');
  }

  /**
   * Insere nova execução e retorna os dados criados.
   */
  async inserir(dados: {
    atividadeId: number;
    descricao: string;
    inicioData: Date;
  }): Promise<ExecucaoIniciadaDto> {
    const resultado = await this.executarConsulta<ExecucaoIniciadaDto>(
      `INSERT INTO execucao (atividade_id, descricao, inicio_data, fim_data, created_date, updated_date, is_deleted)
       SELECT :atividadeId, :descricao, :inicioData, NULL, NOW(), NOW(), false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         created_date AS "createdDate"`,
      {
        atividadeId: dados.atividadeId,
        descricao:   dados.descricao,
        inicioData:  dados.inicioData,
      },
    );
    return resultado[0];
  }

  /**
   * Encerra uma execução definindo fim_data e atualizando a descrição.
   * Retorna a execução encerrada com duração calculada em minutos.
   */
  async encerrar(id: number, fimData: Date, descricao: string): Promise<ExecucaoEncerradaDto> {
    const resultado = await this.executarConsulta<ExecucaoEncerradaDto>(
      `UPDATE execucao
       SET fim_data     = :fimData,
           descricao    = :descricao,
           updated_date = NOW()
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60 AS "duracaoMinutos"`,
      { id, fimData, descricao },
    );
    return resultado[0];
  }

  /**
   * Recupera execução por ID com duração calculada.
   * Retorna null se não encontrada ou deletada.
   */
  async buscarIdentificador(id: number): Promise<ExecucaoEncerradaDto | null> {
    const resultado = await this.executarConsulta<ExecucaoEncerradaDto>(
      `SELECT
         execucao.id,
         execucao.atividade_id AS "atividadeId",
         execucao.descricao,
         execucao.inicio_data  AS "inicioData",
         execucao.fim_data     AS "fimData",
         CASE
           WHEN execucao.fim_data IS NOT NULL
           THEN EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60
           ELSE NULL
         END AS "duracaoMinutos"
       FROM execucao
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       LIMIT 1`,
      { id },
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista execuções com filtros opcionais de atividade, usuário e data.
   * Quando usuarioIdRestricao é fornecido, filtra apenas execuções daquele usuário.
   */
  async listar(
    filtros: ExecucaoListarDto,
    usuarioIdRestricao?: number,
  ): Promise<{ itens: ExecucaoResumoDto[]; total: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = {};
    const condicoes: string[] = [
      'execucao.is_deleted = false',
      'atividade.is_deleted = false',
      'usuario.is_deleted = false',
    ];

    const usuarioFiltrado = usuarioIdRestricao ?? filtros.usuarioId;
    if (usuarioFiltrado !== undefined) {
      condicoes.push('atividade.usuario_id = :usuarioId');
      parametros.usuarioId = usuarioFiltrado;
    }

    if (filtros.atividadeId !== undefined) {
      condicoes.push('execucao.atividade_id = :atividadeId');
      parametros.atividadeId = filtros.atividadeId;
    }

    if (filtros.data !== undefined) {
      condicoes.push(`DATE(execucao.inicio_data) = :data`);
      parametros.data = filtros.data;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(execucao.id)::int AS total
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<ExecucaoResumoDto>(
      `SELECT
         execucao.id,
         execucao.atividade_id                                                          AS "atividadeId",
         atividade.nome                                                                  AS "nomeAtividade",
         execucao.descricao,
         execucao.inicio_data                                                            AS "inicioData",
         execucao.fim_data                                                               AS "fimData",
         CASE
           WHEN execucao.fim_data IS NOT NULL
           THEN EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60
           ELSE NULL
         END                                                                             AS "duracaoMinutos",
         atividade.usuario_id                                                            AS "usuarioId",
         usuario.nome_completo                                                           AS "nomeUsuario"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
       WHERE ${clausulaWhere}
       ORDER BY execucao.inicio_data DESC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Verifica se o usuário possui execução ativa (sem fim_data) em qualquer atividade sua.
   * Retorna os dados básicos da execução ativa, ou null se não houver.
   */
  async buscarExecucaoAtiva(usuarioId: number): Promise<{
    id: number;
    atividadeId: number;
    inicioData: Date;
  } | null> {
    const resultado = await this.executarConsulta<{
      id: number;
      atividadeId: number;
      inicioData: Date;
    }>(
      `SELECT
         execucao.id,
         execucao.atividade_id AS "atividadeId",
         execucao.inicio_data  AS "inicioData"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
         AND atividade.is_deleted = false
       WHERE execucao.fim_data IS NULL
         AND execucao.is_deleted = false
         AND atividade.usuario_id = :usuarioId
       LIMIT 1`,
      { usuarioId },
    );
    return resultado[0] ?? null;
  }

  /**
   * Altera apenas a descrição de uma execução.
   * Retorna a execução alterada com duração calculada.
   */
  async alterar(id: number, descricao: string): Promise<ExecucaoAlteradaDto> {
    const resultado = await this.executarConsulta<ExecucaoAlteradaDto>(
      `UPDATE execucao
       SET descricao    = :descricao,
           updated_date = NOW()
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         CASE
           WHEN fim_data IS NOT NULL
           THEN EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60
           ELSE NULL
         END AS "duracaoMinutos"`,
      { id, descricao },
    );
    return resultado[0];
  }

  /** Soft delete da execução. */
  async excluir(id: number): Promise<void> {
    await this.executarSoftDelete(id);
  }

  /**
   * Busca o usuarioId associado a uma execução via atividade.usuario_id.
   * Usado para autorização nas operações de encerrar, atualizar e excluir.
   */
  async buscarUsuarioExecucao(execucaoId: number): Promise<number | null> {
    const resultado = await this.executarConsulta<{ usuarioId: number }>(
      `SELECT atividade.usuario_id AS "usuarioId"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
         AND atividade.is_deleted = false
       WHERE execucao.id = :execucaoId
         AND execucao.is_deleted = false
       LIMIT 1`,
      { execucaoId },
    );
    return resultado[0]?.usuarioId ?? null;
  }
}
