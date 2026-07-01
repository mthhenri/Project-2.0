import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { PontoJustificativa } from '../domain/models/ponto-justificativa.model';
import {
  PontoJustificativaCriadaDto,
  PontoJustificativaResumoDto,
  PontoJustificativaListarDto,
  PontoJustificativaRecuperarDto,
} from '@project20/shared';

@Injectable()
export class PontoJustificativaRepository extends BaseRepository<PontoJustificativa> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'ponto_justificativa');
  }

  /** Insere nova justificativa e retorna os dados criados. */
  async inserir(dados: {
    usuarioId: number;
    gestorId: number;
    diaData: string;
    nome: string;
    descricao: string;
    horasCobertas: number;
  }): Promise<PontoJustificativaCriadaDto> {
    const resultado = await this.executarConsulta<PontoJustificativaCriadaDto>(
      `INSERT INTO ponto_justificativa (
         usuario_id, gestor_id, dia_data, nome, descricao, horas_cobertas,
         created_date, updated_date, is_deleted
       )
       SELECT :usuarioId, :gestorId, :diaData, :nome, :descricao, :horasCobertas, NOW(), NOW(), false
       RETURNING
         id,
         usuario_id                    AS "usuarioId",
         dia_data::text                AS "diaData",
         nome,
         descricao,
         horas_cobertas::double precision AS "horasCobertas",
         gestor_id                     AS "gestorId",
         created_date                  AS "createdDate"`,
      {
        usuarioId:     dados.usuarioId,
        gestorId:      dados.gestorId,
        diaData:       dados.diaData,
        nome:          dados.nome,
        descricao:     dados.descricao,
        horasCobertas: dados.horasCobertas,
      },
    );
    return resultado[0];
  }

  /**
   * Lista as justificativas ativas de um usuário num mês, com o nome do usuário
   * justificado e do gestor que a criou, ordenadas por dia.
   */
  async listar(dto: PontoJustificativaListarDto): Promise<PontoJustificativaResumoDto[]> {
    return this.executarConsulta<PontoJustificativaResumoDto>(
      `SELECT
         ponto_justificativa.id,
         ponto_justificativa.usuario_id       AS "usuarioId",
         usuario_justificado.nome_completo    AS "nomeUsuario",
         ponto_justificativa.dia_data::text   AS "diaData",
         ponto_justificativa.nome,
         ponto_justificativa.descricao,
         ponto_justificativa.horas_cobertas::double precision AS "horasCobertas",
         ponto_justificativa.gestor_id        AS "gestorId",
         usuario_gestor.nome_completo         AS "nomeGestor",
         ponto_justificativa.created_date     AS "createdDate"
       FROM ponto_justificativa
       INNER JOIN usuario AS usuario_justificado
         ON usuario_justificado.id = ponto_justificativa.usuario_id
         AND usuario_justificado.is_deleted = false
       INNER JOIN usuario AS usuario_gestor
         ON usuario_gestor.id = ponto_justificativa.gestor_id
         AND usuario_gestor.is_deleted = false
       WHERE ponto_justificativa.usuario_id = :usuarioId
         AND EXTRACT(YEAR FROM ponto_justificativa.dia_data) = :ano
         AND EXTRACT(MONTH FROM ponto_justificativa.dia_data) = :mes
         AND ponto_justificativa.is_deleted = false
       ORDER BY ponto_justificativa.dia_data ASC`,
      { usuarioId: dto.usuarioId, ano: dto.ano, mes: dto.mes },
    );
  }

  /**
   * Mesma consulta de `listar`, exposta ao módulo de ponto para montar o mapa de
   * justificativas por dia do mês.
   */
  async listarPorUsuarioEMes(dto: PontoJustificativaListarDto): Promise<PontoJustificativaResumoDto[]> {
    return this.listar(dto);
  }

  /** Recupera uma justificativa ativa por id. Retorna null se não encontrada. */
  async recuperar(dto: PontoJustificativaRecuperarDto): Promise<PontoJustificativaResumoDto | null> {
    const resultado = await this.executarConsulta<PontoJustificativaResumoDto>(
      `SELECT
         ponto_justificativa.id,
         ponto_justificativa.usuario_id       AS "usuarioId",
         usuario_justificado.nome_completo    AS "nomeUsuario",
         ponto_justificativa.dia_data::text   AS "diaData",
         ponto_justificativa.nome,
         ponto_justificativa.descricao,
         ponto_justificativa.horas_cobertas::double precision AS "horasCobertas",
         ponto_justificativa.gestor_id        AS "gestorId",
         usuario_gestor.nome_completo         AS "nomeGestor",
         ponto_justificativa.created_date     AS "createdDate"
       FROM ponto_justificativa
       INNER JOIN usuario AS usuario_justificado
         ON usuario_justificado.id = ponto_justificativa.usuario_id
         AND usuario_justificado.is_deleted = false
       INNER JOIN usuario AS usuario_gestor
         ON usuario_gestor.id = ponto_justificativa.gestor_id
         AND usuario_gestor.is_deleted = false
       WHERE ponto_justificativa.id = :id
         AND ponto_justificativa.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /**
   * Recupera a justificativa ativa de um usuário num dia específico (usada pela visão
   * diária/"todos" do ponto). Retorna null se não houver.
   */
  async recuperarPorUsuarioEDia(dto: {
    usuarioId: number;
    diaData: string;
  }): Promise<PontoJustificativaResumoDto | null> {
    const resultado = await this.executarConsulta<PontoJustificativaResumoDto>(
      `SELECT
         ponto_justificativa.id,
         ponto_justificativa.usuario_id       AS "usuarioId",
         usuario_justificado.nome_completo    AS "nomeUsuario",
         ponto_justificativa.dia_data::text   AS "diaData",
         ponto_justificativa.nome,
         ponto_justificativa.descricao,
         ponto_justificativa.horas_cobertas::double precision AS "horasCobertas",
         ponto_justificativa.gestor_id        AS "gestorId",
         usuario_gestor.nome_completo         AS "nomeGestor",
         ponto_justificativa.created_date     AS "createdDate"
       FROM ponto_justificativa
       INNER JOIN usuario AS usuario_justificado
         ON usuario_justificado.id = ponto_justificativa.usuario_id
         AND usuario_justificado.is_deleted = false
       INNER JOIN usuario AS usuario_gestor
         ON usuario_gestor.id = ponto_justificativa.gestor_id
         AND usuario_gestor.is_deleted = false
       WHERE ponto_justificativa.usuario_id = :usuarioId
         AND ponto_justificativa.dia_data = :diaData
         AND ponto_justificativa.is_deleted = false
       LIMIT 1`,
      { usuarioId: dto.usuarioId, diaData: dto.diaData },
    );
    return resultado[0] ?? null;
  }

  /** Verifica se já existe justificativa ativa para o usuário no dia (regra de unicidade). */
  async validarPorUsuarioEDia(dto: { usuarioId: number; diaData: string }): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM ponto_justificativa
         WHERE ponto_justificativa.usuario_id = :usuarioId
           AND ponto_justificativa.dia_data = :diaData
           AND ponto_justificativa.is_deleted = false
       ) AS existe`,
      { usuarioId: dto.usuarioId, diaData: dto.diaData },
    );
    return resultado[0].existe;
  }

  /** Soft delete da justificativa. */
  async excluir(dto: PontoJustificativaRecuperarDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
