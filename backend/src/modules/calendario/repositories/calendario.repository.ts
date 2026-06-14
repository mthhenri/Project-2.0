import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { DiaNaoUtil } from '../domain/models/dia-nao-util.model';
import {
  DiaNaoUtilCriadoDto,
  DiaNaoUtilResumoDto,
  DiaNaoUtilAtualizadoDto,
  DiaNaoUtilTipoEnum,
} from '@project20/shared';

interface DiaNaoUtilInserirDados {
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  recorrente: boolean;
}

@Injectable()
export class CalendarioRepository extends BaseRepository<DiaNaoUtil> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'dia_nao_util');
  }

  /** Insere novo dia não útil e retorna os dados criados. */
  async inserir(dados: DiaNaoUtilInserirDados): Promise<DiaNaoUtilCriadoDto> {
    const resultado = await this.executarConsulta<DiaNaoUtilCriadoDto>(
      `INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, created_date, updated_date, is_deleted)
       SELECT :diaData::DATE, :descricao, :tipo, :recorrente, NOW(), NOW(), false
       RETURNING
         id,
         dia_data    AS "diaData",
         descricao,
         tipo,
         recorrente,
         created_date AS "createdDate"`,
      {
        diaData:    dados.diaData,
        descricao:  dados.descricao,
        tipo:       dados.tipo,
        recorrente: dados.recorrente,
      },
    );
    return resultado[0];
  }

  /** Recupera dia não útil por ID. Retorna null se não encontrado ou deletado. */
  async buscarIdentificador(id: number): Promise<DiaNaoUtilCriadoDto | null> {
    const resultado = await this.executarConsulta<DiaNaoUtilCriadoDto>(
      `SELECT
         dia_nao_util.id,
         dia_nao_util.dia_data    AS "diaData",
         dia_nao_util.descricao,
         dia_nao_util.tipo,
         dia_nao_util.recorrente,
         dia_nao_util.created_date AS "createdDate"
       FROM dia_nao_util
       WHERE dia_nao_util.id = :id
         AND dia_nao_util.is_deleted = false
       LIMIT 1`,
      { id },
    );
    return resultado[0] ?? null;
  }

  /** Lista todos os dias não úteis ativos ordenados por data. */
  async listar(): Promise<DiaNaoUtilResumoDto[]> {
    return this.executarConsulta<DiaNaoUtilResumoDto>(
      `SELECT
         dia_nao_util.id,
         dia_nao_util.dia_data    AS "diaData",
         dia_nao_util.descricao,
         dia_nao_util.tipo,
         dia_nao_util.recorrente
       FROM dia_nao_util
       WHERE dia_nao_util.is_deleted = false
       ORDER BY dia_nao_util.dia_data ASC`,
    );
  }

  /** Atualiza campos do dia não útil e retorna os dados atualizados. */
  async atualizar(id: number, dados: Partial<DiaNaoUtil>): Promise<DiaNaoUtilAtualizadoDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id };

    if (dados.descricao !== undefined) {
      setClauses.push('descricao = :descricao');
      parametros.descricao = dados.descricao;
    }
    if (dados.tipo !== undefined) {
      setClauses.push('tipo = :tipo');
      parametros.tipo = dados.tipo;
    }
    if (dados.recorrente !== undefined) {
      setClauses.push('recorrente = :recorrente');
      parametros.recorrente = dados.recorrente;
    }

    const resultado = await this.executarConsulta<DiaNaoUtilAtualizadoDto>(
      `UPDATE dia_nao_util
       SET ${setClauses.join(', ')}
       WHERE dia_nao_util.id = :id
         AND dia_nao_util.is_deleted = false
       RETURNING
         id,
         dia_data    AS "diaData",
         descricao,
         tipo,
         recorrente,
         created_date AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Soft delete do dia não útil. */
  async excluir(id: number): Promise<void> {
    await this.executarSoftDelete(id);
  }

  /**
   * Verifica se uma data específica está cadastrada como não útil.
   * Considera tanto dias exatos quanto recorrentes (mesmo mês/dia, qualquer ano).
   */
  async ehDiaNaoUtil(data: Date): Promise<boolean> {
    const resultado = await this.executarConsulta<{ ehDiaNaoUtil: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM dia_nao_util
         WHERE dia_nao_util.is_deleted = false
           AND (
             (dia_nao_util.recorrente = false AND dia_nao_util.dia_data = :data::DATE)
             OR
             (
               dia_nao_util.recorrente = true
               AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = EXTRACT(MONTH FROM :data::DATE)
               AND EXTRACT(DAY FROM dia_nao_util.dia_data)   = EXTRACT(DAY FROM :data::DATE)
             )
           )
       ) AS "ehDiaNaoUtil"`,
      { data },
    );
    return resultado[0].ehDiaNaoUtil;
  }

  /**
   * Retorna o tipo do dia não útil cadastrado para a data informada.
   * Considera dias exatos e recorrentes. Retorna null se a data for dia útil.
   */
  async buscarTipoPorData(data: Date): Promise<DiaNaoUtilTipoEnum | null> {
    const resultado = await this.executarConsulta<{ tipo: DiaNaoUtilTipoEnum }>(
      `SELECT dia_nao_util.tipo
       FROM dia_nao_util
       WHERE dia_nao_util.is_deleted = false
         AND (
           (dia_nao_util.recorrente = false AND dia_nao_util.dia_data = :data::DATE)
           OR
           (
             dia_nao_util.recorrente = true
             AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = EXTRACT(MONTH FROM :data::DATE)
             AND EXTRACT(DAY FROM dia_nao_util.dia_data)   = EXTRACT(DAY FROM :data::DATE)
           )
         )
       LIMIT 1`,
      { data },
    );
    return resultado[0]?.tipo ?? null;
  }
}
