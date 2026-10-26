import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import {
  PlanoPontoCriadoDto,
  PlanoPontoInternoCriarDto,
  PlanoPontoListarDto,
  PlanoPontoResumoDto,
  PlanoPontoSituacaoAlteradaDto,
  PlanoPontoSituacaoInternoAlterarDto,
} from '@project20/shared';
import { BaseEntity } from '../../../core/base/base.entity';

const COLUNAS = `
  plano_ponto.id,
  plano_ponto.plano_id            AS "planoId",
  plano_ponto.rotulo,
  plano_ponto.texto,
  tipo_plano_ponto_situacao.codigo AS situacao,
  plano_ponto.resolucao_texto     AS "resolucaoTexto",
  plano_ponto.created_date        AS "createdDate",
  plano_ponto.updated_date        AS "updatedDate"`;

const JUNCAO = `
  FROM plano_ponto
  INNER JOIN tipo_plano_ponto_situacao
    ON tipo_plano_ponto_situacao.id = plano_ponto.tipo_plano_ponto_situacao_id
   AND tipo_plano_ponto_situacao.is_deleted = false`;

/** Pontos em aberto de um plano (task 235). Só SQL; a regra de acesso e as de situação ficam na service. */
@Injectable()
export class PlanoPontoRepository extends BaseRepository<BaseEntity> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'plano_ponto');
  }

  /** Insere o ponto sempre `ABERTO`. */
  async inserir(dto: PlanoPontoInternoCriarDto): Promise<PlanoPontoCriadoDto> {
    const resultado = await this.executarConsulta<PlanoPontoCriadoDto>(
      `INSERT INTO plano_ponto (plano_id, rotulo, texto, tipo_plano_ponto_situacao_id, resolucao_texto, created_date, updated_date, is_deleted)
       SELECT :planoId, :rotulo, :texto,
              (SELECT tipo_plano_ponto_situacao.id FROM tipo_plano_ponto_situacao WHERE tipo_plano_ponto_situacao.codigo = 'ABERTO' AND tipo_plano_ponto_situacao.is_deleted = false),
              NULL, NOW(), NOW(), false
       RETURNING id, plano_id AS "planoId", rotulo, texto, 'ABERTO' AS situacao`,
      { planoId: dto.planoId, rotulo: dto.rotulo, texto: dto.texto },
    );
    return resultado[0];
  }

  /** Os pontos do plano: os abertos primeiro (do mais antigo), depois os resolvidos, dispensados e decisões (do mais recente). */
  async listar(dto: PlanoPontoListarDto): Promise<PlanoPontoResumoDto[]> {
    return this.executarConsulta<PlanoPontoResumoDto>(
      `SELECT ${COLUNAS}
       ${JUNCAO}
       WHERE plano_ponto.plano_id = :planoId AND plano_ponto.is_deleted = false
       ORDER BY (tipo_plano_ponto_situacao.codigo = 'ABERTO') DESC,
                CASE WHEN tipo_plano_ponto_situacao.codigo = 'ABERTO' THEN plano_ponto.id END ASC,
                plano_ponto.updated_date DESC, plano_ponto.id DESC`,
      { planoId: dto.planoId },
    );
  }

  /** O ponto do plano pedido, ou `null` (de outro plano também é `null`). */
  async recuperar(dto: { planoId: number; id: number }): Promise<PlanoPontoResumoDto | null> {
    const resultado = await this.executarConsulta<PlanoPontoResumoDto>(
      `SELECT ${COLUNAS}
       ${JUNCAO}
       WHERE plano_ponto.id = :id AND plano_ponto.plano_id = :planoId AND plano_ponto.is_deleted = false
       LIMIT 1`,
      { id: dto.id, planoId: dto.planoId },
    );
    return resultado[0] ?? null;
  }

  /** Troca a situação e a resolução (reabrir passa `null`). */
  async alterarSituacao(dto: PlanoPontoSituacaoInternoAlterarDto & { resolucaoTexto: string | null }): Promise<PlanoPontoSituacaoAlteradaDto | null> {
    const resultado = await this.executarConsulta<PlanoPontoSituacaoAlteradaDto>(
      `UPDATE plano_ponto
       SET tipo_plano_ponto_situacao_id = (SELECT tipo_plano_ponto_situacao.id FROM tipo_plano_ponto_situacao WHERE tipo_plano_ponto_situacao.codigo = :situacao AND tipo_plano_ponto_situacao.is_deleted = false),
           resolucao_texto = :resolucaoTexto,
           updated_date = NOW()
       WHERE id = :id AND plano_id = :planoId AND is_deleted = false
       RETURNING id, CAST(:situacao AS text) AS situacao, resolucao_texto AS "resolucaoTexto"`,
      { id: dto.id, planoId: dto.planoId, situacao: dto.situacao, resolucaoTexto: dto.resolucaoTexto },
    );
    return resultado[0] ?? null;
  }
}
