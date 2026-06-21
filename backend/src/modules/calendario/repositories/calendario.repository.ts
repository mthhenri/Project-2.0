import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { DiaNaoUtil } from '../domain/models/dia-nao-util.model';
import {
  DiaNaoUtilCriadoDto,
  DiaNaoUtilResumoDto,
  DiaNaoUtilAlteradoDto,
  DiaNaoUtilTipoEnum,
  DiaNaoUtilDuracaoEnum,
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
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}

/** Tipo e duração do dia não útil cadastrado para uma data. */
interface DiaNaoUtilInfo {
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
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
      `INSERT INTO dia_nao_util (dia_data, descricao, tipo, duracao, recorrente, created_date, updated_date, is_deleted)
       SELECT :diaData::DATE, :descricao, :tipo, :duracao, :recorrente, NOW(), NOW(), false
       RETURNING
         id,
         dia_data    AS "diaData",
         descricao,
         tipo,
         duracao,
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
         dia_nao_util.tipo,
         dia_nao_util.duracao,
         dia_nao_util.recorrente,
         dia_nao_util.created_date AS "createdDate"
       FROM dia_nao_util
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
         dia_nao_util.tipo,
         dia_nao_util.duracao,
         dia_nao_util.recorrente
       FROM dia_nao_util
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
      setClauses.push('tipo = :tipo');
      parametros.tipo = dto.tipo;
    }
    if (dto.duracao !== undefined) {
      setClauses.push('duracao = :duracao');
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
         tipo,
         duracao,
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
   */
  async validarDia(dto: CalendarioVerificarDiaDto): Promise<boolean> {
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
         dia_nao_util.tipo,
         dia_nao_util.duracao
       FROM dia_nao_util
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
   */
  async recuperarTipo(dto: CalendarioVerificarDiaDto): Promise<DiaNaoUtilInfo | null> {
    const resultado = await this.executarConsulta<DiaNaoUtilInfo>(
      `SELECT dia_nao_util.tipo, dia_nao_util.duracao
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
      { data: dto.data },
    );
    return resultado[0] ?? null;
  }
}
