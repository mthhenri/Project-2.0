import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { GrupoFixadaInternoCriarDto, GrupoFixadaInternoExcluirDto, GrupoFixadaInternoListarDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Uma mensagem fixada (`grupo_fixada`); o texto da mensagem fica no armazenamento do chat. */
export interface GrupoFixadaRegistrada {
    grupoId: number;
    mensagemId: string;
    fixadaPorUsuarioId: number;
    fixadaDate: Date;
}

const COLUNAS = `
    grupo_fixada.grupo_id AS "grupoId",
    grupo_fixada.mensagem_id AS "mensagemId",
    grupo_fixada.fixada_por_usuario_id AS "fixadaPorUsuarioId",
    grupo_fixada.created_date AS "fixadaDate"
`;

/** As mensagens fixadas dos grupos e canais do chat (task 250). Quem pode fixar é decidido na service; aqui só há SQL. */
@Injectable()
export class GrupoFixadaRepository extends BaseRepository<GrupoFixadaRegistrada> {
    constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
        super(conexaoBancoDados, 'grupo_fixada');
    }

    /** Fixa a mensagem; devolve `null` quando ela já estava fixada (nada é gravado de novo). */
    async fixar(dto: GrupoFixadaInternoCriarDto): Promise<GrupoFixadaRegistrada | null> {
        const criadas = await this.executarConsulta<GrupoFixadaRegistrada>(
            `
                INSERT INTO
                    grupo_fixada (
                        created_date,
                        updated_date,
                        is_deleted,
                        grupo_id,
                        mensagem_id,
                        fixada_por_usuario_id
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    :grupoId,
                    CAST(:mensagemId AS uuid),
                    :usuarioId
                ON CONFLICT (grupo_id, mensagem_id)
                WHERE
                    is_deleted = false DO NOTHING
                RETURNING
                    grupo_id AS "grupoId",
                    mensagem_id AS "mensagemId",
                    fixada_por_usuario_id AS "fixadaPorUsuarioId",
                    created_date AS "fixadaDate"
            `,
            { ...dto },
        );
        return criadas[0] ?? null;
    }

    /** A fixada dessa mensagem neste grupo; `null` quando não está fixada. */
    async recuperarFixada(dto: GrupoFixadaInternoExcluirDto): Promise<GrupoFixadaRegistrada | null> {
        const encontradas = await this.executarConsulta<GrupoFixadaRegistrada>(
            `
                SELECT
                    ${COLUNAS}
                FROM
                    grupo_fixada
                WHERE
                    grupo_fixada.grupo_id = :grupoId
                    AND grupo_fixada.mensagem_id = CAST(:mensagemId AS uuid)
                    AND grupo_fixada.is_deleted = false
            `,
            { grupoId: dto.grupoId, mensagemId: dto.mensagemId },
        );
        return encontradas[0] ?? null;
    }

    /** As fixadas do grupo, da fixada há menos tempo para a mais antiga. */
    async listarFixadas(dto: GrupoFixadaInternoListarDto): Promise<GrupoFixadaRegistrada[]> {
        return this.executarConsulta<GrupoFixadaRegistrada>(
            `
                SELECT
                    ${COLUNAS}
                FROM
                    grupo_fixada
                WHERE
                    grupo_fixada.grupo_id = :grupoId
                    AND grupo_fixada.is_deleted = false
                ORDER BY
                    grupo_fixada.created_date DESC,
                    grupo_fixada.id DESC
            `,
            { grupoId: dto.grupoId },
        );
    }

    /** Desafixa (exclusão lógica); `false` quando a mensagem não estava fixada. */
    async desafixar(dto: GrupoFixadaInternoExcluirDto): Promise<boolean> {
        const excluidas = await this.executarConsulta<{ id: number }>(
            `
                UPDATE grupo_fixada
                SET
                    is_deleted = true,
                    deleted_date = NOW()
                WHERE
                    grupo_id = :grupoId
                    AND mensagem_id = CAST(:mensagemId AS uuid)
                    AND is_deleted = false
                RETURNING
                    id
            `,
            { grupoId: dto.grupoId, mensagemId: dto.mensagemId },
        );
        return excluidas.length > 0;
    }
}
