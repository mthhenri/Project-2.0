import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { PropostaIa } from '../domain/models/proposta-ia.model';
import { PropostaIaCriarDto, PropostaIaResumoDto, StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';

const COLUNAS_RESUMO = `
         proposta_ia.id,
         proposta_ia.usuario_id               AS "usuarioId",
         tipo_proposta_ia.codigo              AS tipo,
         tipo_proposta_ia_status.codigo       AS status,
         proposta_ia.dados,
         proposta_ia.resultado,
         proposta_ia.resolucao_data           AS "resolucaoData",
         proposta_ia.aplicada_pela_ia         AS "aplicadaPelaIa",
         proposta_ia.created_date             AS "createdDate"`;

const JUNCOES_RESUMO = `
       FROM proposta_ia
       INNER JOIN tipo_proposta_ia
          ON tipo_proposta_ia.id = proposta_ia.tipo_proposta_ia_id
       INNER JOIN tipo_proposta_ia_status
          ON tipo_proposta_ia_status.id = proposta_ia.tipo_proposta_ia_status_id`;

/** Pedido de mudança de situação: só acontece se a proposta ainda está em uma das situações `de` (comparar e trocar, atômico). */
export interface PropostaIaTransicao {
  id: number;
  usuarioId: number;
  de: StatusPropostaIaEnum[];
  para: StatusPropostaIaEnum;
  /** Novos dados (o ajuste do usuário); sem eles, os dados ficam como estão. */
  dados?: Record<string, unknown>;
}

@Injectable()
export class PropostaIaRepository extends BaseRepository<PropostaIa> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'proposta_ia');
  }

  async criar(dto: PropostaIaCriarDto): Promise<PropostaIaResumoDto> {
    const inseridas = await this.executarConsulta<{ id: number }>(
      `INSERT INTO proposta_ia (usuario_id, tipo_proposta_ia_id, tipo_proposta_ia_status_id, dados, aplicada_pela_ia, created_date, updated_date, is_deleted)
       SELECT :usuarioId, tipo_proposta_ia.id, tipo_proposta_ia_status.id, CAST(:dados AS jsonb), :aplicadaPelaIa, NOW(), NOW(), false
       FROM tipo_proposta_ia
       CROSS JOIN tipo_proposta_ia_status
       WHERE tipo_proposta_ia.codigo = :tipo AND tipo_proposta_ia.is_deleted = false
         AND tipo_proposta_ia_status.codigo = :status AND tipo_proposta_ia_status.is_deleted = false
       RETURNING id`,
      { usuarioId: dto.usuarioId, tipo: dto.tipo, dados: JSON.stringify(dto.dados), aplicadaPelaIa: dto.aplicadaPelaIa === true, status: StatusPropostaIaEnum.PENDENTE },
    );
    return (await this.recuperarPorId(inseridas[0].id)) as PropostaIaResumoDto;
  }

  async recuperarPorId(id: number): Promise<PropostaIaResumoDto | undefined> {
    const encontradas = await this.executarConsulta<PropostaIaResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE proposta_ia.id = :id
         AND proposta_ia.is_deleted = false`,
      { id },
    );
    return encontradas[0];
  }

  /** As propostas pendentes do usuário (a mais antiga primeiro). */
  async listarPendentesDoUsuario(usuarioId: number): Promise<PropostaIaResumoDto[]> {
    return this.executarConsulta<PropostaIaResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE proposta_ia.usuario_id = :usuarioId
         AND tipo_proposta_ia_status.codigo = :pendente
         AND proposta_ia.is_deleted = false
       ORDER BY proposta_ia.id`,
      { usuarioId, pendente: StatusPropostaIaEnum.PENDENTE },
    );
  }

  /** Quantas propostas pendentes (de qualquer pessoa) de um tipo trazem aquele plano em `dados`. */
  async contarPendentesDoPlano(dados: { planoId: number; tipo: TipoPropostaIaEnum }): Promise<number> {
    const contagem = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total
       ${JUNCOES_RESUMO}
       WHERE tipo_proposta_ia.codigo = :tipo
         AND tipo_proposta_ia_status.codigo = :pendente
         AND proposta_ia.dados ->> 'planoId' = :planoId
         AND proposta_ia.is_deleted = false`,
      { tipo: dados.tipo, pendente: StatusPropostaIaEnum.PENDENTE, planoId: String(dados.planoId) },
    );
    return Number(contagem[0].total);
  }

  /**
   * Troca a situação **só se** a atual é uma das de `de` e a proposta é do usuário. Quem não recebe linha de volta perdeu a corrida
   * (outra chamada já resolveu): devolve `undefined`. É isto que impede uma ação de rodar duas vezes.
   */
  async transitar(transicao: PropostaIaTransicao): Promise<PropostaIaResumoDto | undefined> {
    const alteradas = await this.executarConsulta<{ id: number }>(
      `UPDATE proposta_ia
       SET tipo_proposta_ia_status_id = (
             SELECT tipo_proposta_ia_status.id FROM tipo_proposta_ia_status
             WHERE tipo_proposta_ia_status.codigo = :para AND tipo_proposta_ia_status.is_deleted = false),
           dados = COALESCE(CAST(:dados AS jsonb), proposta_ia.dados),
           resolucao_data = CASE WHEN :para = :pendente THEN NULL ELSE NOW() END
       FROM tipo_proposta_ia_status AS status_atual
       WHERE status_atual.id = proposta_ia.tipo_proposta_ia_status_id
         AND proposta_ia.id = :id
         AND proposta_ia.usuario_id = :usuarioId
         AND proposta_ia.is_deleted = false
         AND status_atual.codigo = ANY(:de)
       RETURNING proposta_ia.id`,
      {
        id: transicao.id,
        usuarioId: transicao.usuarioId,
        de: transicao.de,
        para: transicao.para,
        pendente: StatusPropostaIaEnum.PENDENTE,
        dados: transicao.dados ? JSON.stringify(transicao.dados) : null,
      },
    );
    if (alteradas.length === 0) return undefined;
    return this.recuperarPorId(transicao.id);
  }

  /** Guarda o que a ação criou ou alterou (necessário para desfazer). */
  async registrarResultado(id: number, resultado: Record<string, unknown>): Promise<PropostaIaResumoDto | undefined> {
    await this.executarComando(
      `UPDATE proposta_ia SET resultado = CAST(:resultado AS jsonb) WHERE proposta_ia.id = :id AND proposta_ia.is_deleted = false`,
      { id, resultado: JSON.stringify(resultado) },
    );
    return this.recuperarPorId(id);
  }
}
