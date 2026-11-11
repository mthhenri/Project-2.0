import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
    MensagemDiretaReacaoInternoDefinirDto,
    MensagemDiretaReacaoInternoRemoverDto,
    MensagemDiretaReacaoListarDto,
    MensagemDiretaReacaoRecuperadaDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

const COLUNAS_DA_REACAO = `
    mensagem_direta_reacao.mensagem_id::text AS "mensagemId",
    mensagem_direta_reacao.usuario_id AS "usuarioId",
    mensagem_direta_reacao.reacao AS reacao
`;

/**
 * As reações às mensagens do chat entre colaboradores (task 314): uma por pessoa por mensagem, na tabela `mensagem_direta_reacao`, igual para as três
 * implementações do armazenamento (a mensagem pode viver no índice). Trocar é UPDATE; remover é soft delete.
 */
@Injectable()
export class MensagemDiretaReacaoRepository extends BaseRepository<MensagemDiretaReacaoRecuperadaDto> {
    constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
        super(conexaoBancoDados, 'mensagem_direta_reacao');
    }

    /** As reações de várias mensagens numa consulta só, na ordem em que foram dadas. Sem ids não consulta. */
    async listarPorMensagens(dto: MensagemDiretaReacaoListarDto): Promise<MensagemDiretaReacaoRecuperadaDto[]> {
        if (dto.mensagemIds.length === 0) return [];
        return this.executarConsulta<MensagemDiretaReacaoRecuperadaDto>(
            `
                SELECT
                    ${COLUNAS_DA_REACAO}
                FROM
                    mensagem_direta_reacao
                WHERE
                    mensagem_direta_reacao.mensagem_id = ANY (CAST(:mensagemIds AS uuid[]))
                    AND mensagem_direta_reacao.is_deleted = false
                ORDER BY
                    mensagem_direta_reacao.created_date,
                    mensagem_direta_reacao.id
            `,
            { mensagemIds: dto.mensagemIds },
        );
    }

    /** Grava a reação da pessoa à mensagem, trocando a que já havia (uma por pessoa por mensagem). */
    async definir(dto: MensagemDiretaReacaoInternoDefinirDto): Promise<MensagemDiretaReacaoRecuperadaDto> {
        const gravadas = await this.executarConsulta<MensagemDiretaReacaoRecuperadaDto>(
            `
                INSERT INTO
                    mensagem_direta_reacao (
                        created_date,
                        updated_date,
                        is_deleted,
                        mensagem_id,
                        conversa_id,
                        usuario_id,
                        reacao
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    CAST(:mensagemId AS uuid),
                    :conversaId,
                    :usuarioId,
                    :reacao
                ON CONFLICT (mensagem_id, usuario_id)
                WHERE
                    is_deleted = false DO UPDATE
                SET
                    reacao = EXCLUDED.reacao,
                    updated_date = NOW()
                RETURNING
                    ${COLUNAS_DA_REACAO}
            `,
            { ...dto },
        );
        return gravadas[0];
    }

    /** Tira a reação da pessoa (soft delete); sem reação ativa não faz nada. */
    async remover(dto: MensagemDiretaReacaoInternoRemoverDto): Promise<void> {
        await this.executarComando(
            `
                UPDATE mensagem_direta_reacao
                SET
                    is_deleted = true,
                    deleted_date = NOW()
                WHERE
                    mensagem_direta_reacao.mensagem_id = CAST(:mensagemId AS uuid)
                    AND mensagem_direta_reacao.usuario_id = :usuarioId
                    AND mensagem_direta_reacao.is_deleted = false
            `,
            { ...dto },
        );
    }
}
