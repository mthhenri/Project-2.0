import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
    GrupoInternoAlterarDto,
    GrupoInternoCriarDto,
    GrupoListarDto,
    GrupoMembroInternoAdicionarDto,
    GrupoMembroInternoSairDto,
    GrupoMembroListarDto,
    GrupoMembroRecuperarDto,
    GrupoRecuperarDto,
    TipoGrupoEnum,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Um grupo do chat entre colaboradores (`grupo`), com o tipo já traduzido para o enum. */
export interface GrupoRegistrado {
    grupoId: number;
    nome: string;
    tipo: TipoGrupoEnum;
    criadorUsuarioId: number;
    corAvatar: string | null;
    emojiAvatar: string | null;
    projetoId: number | null;
    demandaId: number | null;
    createdDate: Date;
}

/** Uma pessoa num grupo livre (`grupo_membro`); `saidaData` preenchida significa que ela saiu. */
export interface GrupoMembroRegistrado {
    grupoId: number;
    usuarioId: number;
    entradaData: Date;
    saidaData: Date | null;
}

const COLUNAS_DO_GRUPO = `
    grupo.id AS "grupoId",
    grupo.nome AS nome,
    tipo_grupo.codigo AS tipo,
    grupo.criador_usuario_id AS "criadorUsuarioId",
    grupo.cor_avatar AS "corAvatar",
    grupo.emoji_avatar AS "emojiAvatar",
    grupo.projeto_id AS "projetoId",
    grupo.demanda_id AS "demandaId",
    grupo.created_date AS "createdDate"
`;

const COLUNAS_DO_MEMBRO = `
    grupo_membro.grupo_id AS "grupoId",
    grupo_membro.usuario_id AS "usuarioId",
    grupo_membro.entrada_data AS "entradaData",
    grupo_membro.saida_data AS "saidaData"
`;

/**
 * Os grupos do chat entre colaboradores e os membros do grupo livre (task 246). Quem pode o quê é decidido na service; aqui só há SQL.
 * Sair é preencher `saida_data`; o último membro a sair encerra o grupo (soft delete) na mesma transação, e o histórico permanece no armazenamento.
 */
@Injectable()
export class GrupoRepository extends BaseRepository<GrupoRegistrado> {
    constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
        super(conexaoBancoDados, 'grupo');
    }

    /** Cria o grupo. O criador entra como membro por `adicionarMembro`, chamado pela service. */
    async criarGrupo(dto: GrupoInternoCriarDto): Promise<GrupoRegistrado> {
        const criados = await this.executarConsulta<{ id: number }>(
            `
                INSERT INTO
                    grupo (
                        created_date,
                        updated_date,
                        is_deleted,
                        nome,
                        tipo_grupo_id,
                        criador_usuario_id,
                        projeto_id,
                        demanda_id,
                        cor_avatar,
                        emoji_avatar
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    :nome,
                    (
                        SELECT
                            tipo_grupo.id
                        FROM
                            tipo_grupo
                        WHERE
                            tipo_grupo.codigo = :tipo
                            AND tipo_grupo.is_deleted = false
                    ),
                    :criadorUsuarioId,
                    CAST(:projetoId AS integer),
                    CAST(:demandaId AS integer),
                    CAST(:corAvatar AS varchar),
                    CAST(:emojiAvatar AS varchar)
                RETURNING
                    id
            `,
            { ...dto },
        );
        return (await this.recuperarGrupo({ grupoId: criados[0].id })) as GrupoRegistrado;
    }

    /** O grupo com esse id; `null` quando não existe ou já foi encerrado. */
    async recuperarGrupo(dto: GrupoRecuperarDto): Promise<GrupoRegistrado | null> {
        const encontrados = await this.executarConsulta<GrupoRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_GRUPO}
                FROM
                    grupo
                    JOIN tipo_grupo ON tipo_grupo.id = grupo.tipo_grupo_id
                    AND tipo_grupo.is_deleted = false
                WHERE
                    grupo.id = :grupoId
                    AND grupo.is_deleted = false
            `,
            { grupoId: dto.grupoId },
        );
        return encontrados[0] ?? null;
    }

    /** Os grupos em que a pessoa é membro agora, do mais recente para o mais antigo. */
    async listarGruposDoUsuario(dto: GrupoListarDto): Promise<GrupoRegistrado[]> {
        return this.executarConsulta<GrupoRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_GRUPO}
                FROM
                    grupo_membro
                    JOIN grupo ON grupo.id = grupo_membro.grupo_id
                    AND grupo.is_deleted = false
                    JOIN tipo_grupo ON tipo_grupo.id = grupo.tipo_grupo_id
                    AND tipo_grupo.is_deleted = false
                WHERE
                    grupo_membro.usuario_id = :usuarioId
                    AND grupo_membro.saida_data IS NULL
                    AND grupo_membro.is_deleted = false
                ORDER BY
                    grupo.created_date DESC,
                    grupo.id DESC
            `,
            { usuarioId: dto.usuarioId },
        );
    }

    /** Troca nome, cor e emoji; `null` quando o grupo não existe ou já foi encerrado. */
    async alterarGrupo(dto: GrupoInternoAlterarDto): Promise<GrupoRegistrado | null> {
        const alterados = await this.executarConsulta<{ id: number }>(
            `
                UPDATE grupo
                SET
                    nome = :nome,
                    cor_avatar = CAST(:corAvatar AS varchar),
                    emoji_avatar = CAST(:emojiAvatar AS varchar),
                    updated_date = NOW()
                WHERE
                    id = :grupoId
                    AND is_deleted = false
                RETURNING
                    id
            `,
            { ...dto },
        );
        return alterados.length > 0 ? this.recuperarGrupo({ grupoId: dto.grupoId }) : null;
    }

    /** Os membros que não saíram, do que entrou primeiro ao último. */
    async listarMembros(dto: GrupoMembroListarDto): Promise<GrupoMembroRegistrado[]> {
        return this.executarConsulta<GrupoMembroRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_MEMBRO}
                FROM
                    grupo_membro
                    JOIN grupo ON grupo.id = grupo_membro.grupo_id
                    AND grupo.is_deleted = false
                WHERE
                    grupo_membro.grupo_id = :grupoId
                    AND grupo_membro.saida_data IS NULL
                    AND grupo_membro.is_deleted = false
                ORDER BY
                    grupo_membro.entrada_data ASC,
                    grupo_membro.usuario_id ASC
            `,
            { grupoId: dto.grupoId },
        );
    }

    /** A linha da pessoa no grupo, mesmo que ela tenha saído (`saidaData` preenchida); `null` quando nunca entrou ou o grupo foi encerrado. */
    async recuperarMembro(dto: GrupoMembroRecuperarDto): Promise<GrupoMembroRegistrado | null> {
        const encontrados = await this.executarConsulta<GrupoMembroRegistrado>(
            `
                SELECT
                    ${COLUNAS_DO_MEMBRO}
                FROM
                    grupo_membro
                    JOIN grupo ON grupo.id = grupo_membro.grupo_id
                    AND grupo.is_deleted = false
                WHERE
                    grupo_membro.grupo_id = :grupoId
                    AND grupo_membro.usuario_id = :usuarioId
                    AND grupo_membro.is_deleted = false
            `,
            { grupoId: dto.grupoId, usuarioId: dto.usuarioId },
        );
        return encontrados[0] ?? null;
    }

    /**
   * Põe a pessoa no grupo: cria a linha ou, se ela tinha saído, reabre a mesma com a entrada nova (as não lidas contam desde a última entrada).
   * Devolve `null` quando nada mudou: o grupo não existe ou foi encerrado, ou a pessoa já é membro.
   */
    async adicionarMembro(dto: GrupoMembroInternoAdicionarDto): Promise<GrupoMembroRegistrado | null> {
        const gravados = await this.executarConsulta<GrupoMembroRegistrado>(
            `
                INSERT INTO
                    grupo_membro (
                        created_date,
                        updated_date,
                        is_deleted,
                        grupo_id,
                        usuario_id,
                        entrada_data,
                        saida_data
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    grupo.id,
                    :usuarioId,
                    CAST(:entradaData AS timestamptz),
                    CAST(NULL AS timestamptz)
                FROM
                    grupo
                WHERE
                    grupo.id = :grupoId
                    AND grupo.is_deleted = false
                ON CONFLICT (grupo_id, usuario_id)
                WHERE
                    is_deleted = false DO UPDATE
                SET
                    entrada_data = EXCLUDED.entrada_data,
                    saida_data = NULL,
                    updated_date = NOW()
                WHERE
                    grupo_membro.saida_data IS NOT NULL
                RETURNING
                    grupo_id AS "grupoId",
                    usuario_id AS "usuarioId",
                    entrada_data AS "entradaData",
                    saida_data AS "saidaData"
            `,
            { grupoId: dto.grupoId, usuarioId: dto.usuarioId, entradaData: dto.entradaData.toISOString() },
        );
        return gravados[0] ?? null;
    }

    /**
   * A pessoa sai do grupo. Na mesma transação, com o grupo travado, conta quem sobrou: se ninguém, o grupo é encerrado (soft delete).
   * Devolve `null` quando nada mudou (o grupo não existe ou a pessoa não é membro agora) e `{ grupoEncerrado }` quando a saída aconteceu.
   */
    async sairDoGrupo(dto: GrupoMembroInternoSairDto): Promise<{ grupoEncerrado: boolean } | null> {
        return this.conexaoBancoDados.transaction(async (transacao) => {
            const travados = await this.executarConsulta<{ id: number }>(
                `
                    SELECT
                        grupo.id
                    FROM
                        grupo
                    WHERE
                        grupo.id = :grupoId
                        AND grupo.is_deleted = false
                    FOR UPDATE
                `,
                { grupoId: dto.grupoId },
                transacao,
            );
            if (travados.length === 0) return null;

            const saidas = await this.executarConsulta<{ id: number }>(
                `
                    UPDATE grupo_membro
                    SET
                        saida_data = CAST(:saidaData AS timestamptz),
                        updated_date = NOW()
                    WHERE
                        grupo_id = :grupoId
                        AND usuario_id = :usuarioId
                        AND saida_data IS NULL
                        AND is_deleted = false
                    RETURNING
                        id
                `,
                { grupoId: dto.grupoId, usuarioId: dto.usuarioId, saidaData: dto.saidaData.toISOString() },
                transacao,
            );
            if (saidas.length === 0) return null;

            const restantes = await this.executarConsulta<{ total: number }>(
                `
                    SELECT
                        CAST(COUNT(*) AS integer) AS total
                    FROM
                        grupo_membro
                    WHERE
                        grupo_id = :grupoId
                        AND saida_data IS NULL
                        AND is_deleted = false
                `,
                { grupoId: dto.grupoId },
                transacao,
            );
            const grupoEncerrado = (restantes[0]?.total ?? 0) === 0;
            if (grupoEncerrado) {
                await this.executarComando(
                    `
                        UPDATE grupo
                        SET
                            is_deleted = true,
                            deleted_date = NOW()
                        WHERE
                            id = :grupoId
                            AND is_deleted = false
                    `,
                    { grupoId: dto.grupoId },
                    transacao,
                );
            }
            return { grupoEncerrado };
        });
    }
}
