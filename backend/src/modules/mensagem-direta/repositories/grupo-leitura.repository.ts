import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { GrupoLeituraInternoAlterarDto, GrupoLeituraMarcadorListarDto, GrupoLeituraMarcadorRecuperarDto, GrupoSilencioInternoAlterarDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Até onde uma pessoa leu um grupo e se ela silenciou os avisos dele (`grupo_leitura`). */
export interface GrupoMarcadorRegistrado {
    grupoId: number;
    /** A data da última mensagem que a pessoa viu; `null` quando só silenciou o grupo e ainda não leu nada (valem as não lidas desde a entrada). */
    lidaAteData: Date | null;
    silenciada: boolean;
}

const COLUNAS_DO_MARCADOR = `
    grupo_leitura.grupo_id AS "grupoId",
    grupo_leitura.lida_ate_data AS "lidaAteData",
    grupo_leitura.silenciada AS silenciada
`;

/**
 * O estado de leitura e de silêncio dos grupos (task 246). Uma linha por pessoa e grupo, criada na primeira leitura ou na primeira vez que o grupo
 * é silenciado. A marcação de leitura **nunca recua**: uma requisição atrasada não reabre as não lidas.
 */
@Injectable()
export class GrupoLeituraRepository extends BaseRepository<GrupoMarcadorRegistrado> {
    constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
        super(conexaoBancoDados, 'grupo_leitura');
    }

    /** Os marcadores de todos os grupos da pessoa. */
    async listarMarcadores(dto: GrupoLeituraMarcadorListarDto): Promise<GrupoMarcadorRegistrado[]> {
        return this.executarConsulta<GrupoMarcadorRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_MARCADOR}
                FROM
                    grupo_leitura
                WHERE
                    grupo_leitura.usuario_id = :usuarioId
                    AND grupo_leitura.is_deleted = false
            `,
            { usuarioId: dto.usuarioId },
        );
    }

    /** O marcador de uma pessoa num grupo; `null` quando ela nunca leu nem silenciou. */
    async recuperarMarcador(dto: GrupoLeituraMarcadorRecuperarDto): Promise<GrupoMarcadorRegistrado | null> {
        const encontrados = await this.executarConsulta<GrupoMarcadorRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_MARCADOR}
                FROM
                    grupo_leitura
                WHERE
                    grupo_leitura.grupo_id = :grupoId
                    AND grupo_leitura.usuario_id = :usuarioId
                    AND grupo_leitura.is_deleted = false
            `,
            { grupoId: dto.grupoId, usuarioId: dto.usuarioId },
        );
        return encontrados[0] ?? null;
    }

    /** Cria o marcador ou avança `lida_ate_data`; `GREATEST` mantém a data mais nova. Não mexe em `silenciada`. */
    async alterarLeitura(dto: GrupoLeituraInternoAlterarDto): Promise<GrupoMarcadorRegistrado> {
        const gravados = await this.executarConsulta<GrupoMarcadorRegistrado>(
            `
                INSERT INTO
                    grupo_leitura (
                        created_date,
                        updated_date,
                        is_deleted,
                        grupo_id,
                        usuario_id,
                        lida_ate_data,
                        silenciada
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    :grupoId,
                    :usuarioId,
                    CAST(:lidaAteData AS timestamptz),
                    false
                ON CONFLICT (grupo_id, usuario_id)
                WHERE
                    is_deleted = false DO UPDATE
                SET
                    lida_ate_data = GREATEST(
                        grupo_leitura.lida_ate_data,
                        EXCLUDED.lida_ate_data
                    ),
                    updated_date = NOW()
                RETURNING
                    ${COLUNAS_DO_MARCADOR}
            `,
            { grupoId: dto.grupoId, usuarioId: dto.usuarioId, lidaAteData: dto.lidaAteData.toISOString() },
        );
        return gravados[0];
    }

    /** Cria o marcador ou altera `silenciada`, sem apagar até onde a pessoa já leu. */
    async alterarSilencio(dto: GrupoSilencioInternoAlterarDto): Promise<GrupoMarcadorRegistrado> {
        const gravados = await this.executarConsulta<GrupoMarcadorRegistrado>(
            `
                INSERT INTO
                    grupo_leitura (
                        created_date,
                        updated_date,
                        is_deleted,
                        grupo_id,
                        usuario_id,
                        lida_ate_data,
                        silenciada
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    :grupoId,
                    :usuarioId,
                    CAST(NULL AS timestamptz),
                    :silenciada
                ON CONFLICT (grupo_id, usuario_id)
                WHERE
                    is_deleted = false DO UPDATE
                SET
                    silenciada = EXCLUDED.silenciada,
                    updated_date = NOW()
                RETURNING
                    ${COLUNAS_DO_MARCADOR}
            `,
            { grupoId: dto.grupoId, usuarioId: dto.usuarioId, silenciada: dto.silenciada },
        );
        return gravados[0];
    }
}
