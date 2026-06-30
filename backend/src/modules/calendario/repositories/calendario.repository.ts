import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { DiaNaoUtil } from '../domain/models/dia-nao-util.model';
import {
  DiaNaoUtilCriadoDto,
  DiaNaoUtilResumoDto,
  DiaNaoUtilAlteradoDto,
  TipoDiaNaoUtilEnum,
  TipoDiaNaoUtilDuracaoEnum,
  CalendarioRecuperarDto,
  CalendarioInternoAlterarDto,
  CalendarioExcluirDto,
  CalendarioVerificarDiaDto,
  CalendarioMesConsultarDto,
  CalendarioDiaNaoUtilMesDto,
} from '@project20/shared';

interface DiaNaoUtilInserirDados {
  diaData: string;
  descricao: string;
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}

/** Tipo e duração do dia não útil cadastrado para uma data. */
interface DiaNaoUtilInfo {
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
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
      `INSERT INTO dia_nao_util (dia_data, descricao, tipo_dia_nao_util_id, tipo_dia_nao_util_duracao_id, recorrente, created_date, updated_date, is_deleted)
       SELECT :diaData::DATE, :descricao,
         (SELECT tipo_dia_nao_util.id FROM tipo_dia_nao_util
            WHERE tipo_dia_nao_util.codigo = :tipo AND tipo_dia_nao_util.is_deleted = false),
         (SELECT tipo_dia_nao_util_duracao.id FROM tipo_dia_nao_util_duracao
            WHERE tipo_dia_nao_util_duracao.codigo = :duracao AND tipo_dia_nao_util_duracao.is_deleted = false),
         :recorrente, NOW(), NOW(), false
       RETURNING
         id,
         dia_data    AS "diaData",
         descricao,
         (SELECT tipo_dia_nao_util.codigo FROM tipo_dia_nao_util
            WHERE tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id) AS tipo,
         (SELECT tipo_dia_nao_util_duracao.codigo FROM tipo_dia_nao_util_duracao
            WHERE tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id) AS duracao,
         recorrente,
         created_date AS "createdDate"`,
      {
        diaData:    dados.diaData,
        descricao:  dados.descricao,
        tipo:       dados.tipo,
        duracao:    dados.duracao,
        recorrente: dados.recorrente,
      },
    );
    return resultado[0];
  }

  /** Recupera dia não útil por ID. Retorna null se não encontrado ou deletado. */
  async recuperar(dto: CalendarioRecuperarDto): Promise<DiaNaoUtilCriadoDto | null> {
    const resultado = await this.executarConsulta<DiaNaoUtilCriadoDto>(
      `SELECT
         dia_nao_util.id,
         dia_nao_util.dia_data    AS "diaData",
         dia_nao_util.descricao,
         tipo_dia_nao_util.codigo         AS tipo,
         tipo_dia_nao_util_duracao.codigo AS duracao,
         dia_nao_util.recorrente,
         dia_nao_util.created_date AS "createdDate"
       FROM dia_nao_util
       INNER JOIN tipo_dia_nao_util
         ON tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id
         AND tipo_dia_nao_util.is_deleted = false
       INNER JOIN tipo_dia_nao_util_duracao
         ON tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id
         AND tipo_dia_nao_util_duracao.is_deleted = false
       WHERE dia_nao_util.id = :id
         AND dia_nao_util.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
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
         tipo_dia_nao_util.codigo         AS tipo,
         tipo_dia_nao_util_duracao.codigo AS duracao,
         dia_nao_util.recorrente
       FROM dia_nao_util
       INNER JOIN tipo_dia_nao_util
         ON tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id
         AND tipo_dia_nao_util.is_deleted = false
       INNER JOIN tipo_dia_nao_util_duracao
         ON tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id
         AND tipo_dia_nao_util_duracao.is_deleted = false
       WHERE dia_nao_util.is_deleted = false
       ORDER BY dia_nao_util.dia_data ASC`,
    );
  }

  /** Altera campos do dia não útil e retorna os dados alterados. */
  async alterar(dto: CalendarioInternoAlterarDto): Promise<DiaNaoUtilAlteradoDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id: dto.id };

    if (dto.descricao !== undefined) {
      setClauses.push('descricao = :descricao');
      parametros.descricao = dto.descricao;
    }
    if (dto.tipo !== undefined) {
      setClauses.push(
        'tipo_dia_nao_util_id = (SELECT tipo_dia_nao_util.id FROM tipo_dia_nao_util WHERE tipo_dia_nao_util.codigo = :tipo AND tipo_dia_nao_util.is_deleted = false)',
      );
      parametros.tipo = dto.tipo;
    }
    if (dto.duracao !== undefined) {
      setClauses.push(
        'tipo_dia_nao_util_duracao_id = (SELECT tipo_dia_nao_util_duracao.id FROM tipo_dia_nao_util_duracao WHERE tipo_dia_nao_util_duracao.codigo = :duracao AND tipo_dia_nao_util_duracao.is_deleted = false)',
      );
      parametros.duracao = dto.duracao;
    }
    if (dto.recorrente !== undefined) {
      setClauses.push('recorrente = :recorrente');
      parametros.recorrente = dto.recorrente;
    }

    const resultado = await this.executarConsulta<DiaNaoUtilAlteradoDto>(
      `UPDATE dia_nao_util
       SET ${setClauses.join(', ')}
       WHERE dia_nao_util.id = :id
         AND dia_nao_util.is_deleted = false
       RETURNING
         id,
         dia_data    AS "diaData",
         descricao,
         (SELECT tipo_dia_nao_util.codigo FROM tipo_dia_nao_util
            WHERE tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id) AS tipo,
         (SELECT tipo_dia_nao_util_duracao.codigo FROM tipo_dia_nao_util_duracao
            WHERE tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id) AS duracao,
         recorrente,
         created_date AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Soft delete do dia não útil. */
  async excluir(dto: CalendarioExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Verifica se uma data específica está cadastrada como não útil.
   * Considera tanto dias exatos quanto recorrentes (mesmo mês/dia, qualquer ano).
   *
   * `dto.data` chega como instante em meia-noite UTC (convenção do calendário, que usa
   * `getUTCDay`/`Date.UTC`). Como a sessão do banco roda no fuso da app (timestamptz),
   * extrai-se o dia de calendário com `AT TIME ZONE 'UTC'` antes do `::date` — assim o
   * dia casado independe do fuso da sessão (evita off-by-one ao bucketizar em BRT).
   */
  async validarDia(dto: CalendarioVerificarDiaDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ ehDiaNaoUtil: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM dia_nao_util
         WHERE dia_nao_util.is_deleted = false
           AND (
             (dia_nao_util.recorrente = false AND dia_nao_util.dia_data = (:data AT TIME ZONE 'UTC')::date)
             OR
             (
               dia_nao_util.recorrente = true
               AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = EXTRACT(MONTH FROM (:data AT TIME ZONE 'UTC')::date)
               AND EXTRACT(DAY FROM dia_nao_util.dia_data)   = EXTRACT(DAY FROM (:data AT TIME ZONE 'UTC')::date)
             )
           )
       ) AS "ehDiaNaoUtil"`,
      { data: dto.data },
    );
    return resultado[0].ehDiaNaoUtil;
  }

  /**
   * Lista os dias do mês marcados como não úteis (feriado/recesso/ponto facultativo),
   * considerando registros exatos do ano/mês e recorrentes do mês. Retorna o número do
   * dia (1–31) e o tipo, para o cálculo de dias úteis e exibição do motivo no mensal.
   */
  async listarDiasNaoUteisDoMes(dto: CalendarioMesConsultarDto): Promise<CalendarioDiaNaoUtilMesDto[]> {
    return this.executarConsulta<CalendarioDiaNaoUtilMesDto>(
      `SELECT DISTINCT
         EXTRACT(DAY FROM dia_nao_util.dia_data)::int AS "dia",
         tipo_dia_nao_util.codigo         AS tipo,
         tipo_dia_nao_util_duracao.codigo AS duracao
       FROM dia_nao_util
       INNER JOIN tipo_dia_nao_util
         ON tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id
         AND tipo_dia_nao_util.is_deleted = false
       INNER JOIN tipo_dia_nao_util_duracao
         ON tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id
         AND tipo_dia_nao_util_duracao.is_deleted = false
       WHERE dia_nao_util.is_deleted = false
         AND (
           (
             dia_nao_util.recorrente = false
             AND EXTRACT(YEAR FROM dia_nao_util.dia_data)  = :ano
             AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = :mes
           )
           OR
           (
             dia_nao_util.recorrente = true
             AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = :mes
           )
         )
       ORDER BY "dia" ASC`,
      { ano: dto.ano, mes: dto.mes },
    );
  }

  /**
   * Retorna o tipo e a duração do dia não útil cadastrado para a data informada.
   * Considera dias exatos e recorrentes. Retorna null se a data for dia útil.
   *
   * `dto.data` é instante em meia-noite UTC; extrai-se o dia de calendário com
   * `AT TIME ZONE 'UTC'` antes do `::date` para que o casamento independa do fuso da
   * sessão (que roda em BRT desde a migração para timestamptz). Ver `validarDia`.
   */
  async recuperarTipo(dto: CalendarioVerificarDiaDto): Promise<DiaNaoUtilInfo | null> {
    const resultado = await this.executarConsulta<DiaNaoUtilInfo>(
      `SELECT tipo_dia_nao_util.codigo AS tipo, tipo_dia_nao_util_duracao.codigo AS duracao
       FROM dia_nao_util
       INNER JOIN tipo_dia_nao_util
         ON tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id
         AND tipo_dia_nao_util.is_deleted = false
       INNER JOIN tipo_dia_nao_util_duracao
         ON tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id
         AND tipo_dia_nao_util_duracao.is_deleted = false
       WHERE dia_nao_util.is_deleted = false
         AND (
           (dia_nao_util.recorrente = false AND dia_nao_util.dia_data = (:data AT TIME ZONE 'UTC')::date)
           OR
           (
             dia_nao_util.recorrente = true
             AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = EXTRACT(MONTH FROM (:data AT TIME ZONE 'UTC')::date)
             AND EXTRACT(DAY FROM dia_nao_util.dia_data)   = EXTRACT(DAY FROM (:data AT TIME ZONE 'UTC')::date)
           )
         )
       LIMIT 1`,
      { data: dto.data },
    );
    return resultado[0] ?? null;
  }
}
