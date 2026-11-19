import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
    GrupoResumoIaGravadoInternoMarcarDto,
    GrupoResumoIaInternoCriarDto,
    GrupoResumoIaInternoRecuperarDto,
    GrupoResumoIaListarDto,
    GrupoResumoIaPropostaInternoMarcarDto,
    GrupoResumoIaUltimoRecuperarDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Um resumo guardado (`grupo_resumo`); `texto` é nulo nos resumos feitos antes da migration 0091. */
export interface GrupoResumoIaRegistrado {
    resumoId: number;
    grupoId: number;
    usuarioId: number;
    inicioData: Date;
    fimData: Date;
    enviouCodigo: boolean;
    quantidadeMensagens: number;
    texto: string | null;
    modelo: string;
    tokensEntrada: number;
    tokensSaida: number;
    propostaIaId: number | null;
    demandaId: number | null;
    gravadaData: Date | null;
}

/** Quantos resumos o histórico do grupo devolve (os mais recentes). */
export const LIMITE_DE_RESUMOS_NO_HISTORICO = 50;

const COLUNAS = `
    grupo_resumo.id AS "resumoId",
    grupo_resumo.grupo_id AS "grupoId",
    grupo_resumo.usuario_id AS "usuarioId",
    grupo_resumo.inicio_data AS "inicioData",
    grupo_resumo.fim_data AS "fimData",
    grupo_resumo.enviou_codigo AS "enviouCodigo",
    grupo_resumo.quantidade_mensagens AS "quantidadeMensagens",
    grupo_resumo.texto AS texto,
    grupo_resumo.modelo AS modelo,
    grupo_resumo.tokens_entrada AS "tokensEntrada",
    grupo_resumo.tokens_saida AS "tokensSaida",
    grupo_resumo.proposta_ia_id AS "propostaIaId",
    grupo_resumo.demanda_id AS "demandaId",
    grupo_resumo.gravada_data AS "gravadaData"
`;

/** Os resumos de grupo e canal feitos pela IA (task 249, tabela `grupo_resumo`). Quem pode o quê é decidido na service; aqui só há SQL. */
@Injectable()
export class GrupoResumoRepository extends BaseRepository<GrupoResumoIaRegistrado> {
    constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
        super(conexaoBancoDados, 'grupo_resumo');
    }

    async criarResumo(dto: GrupoResumoIaInternoCriarDto): Promise<GrupoResumoIaRegistrado> {
        const criados = await this.executarConsulta<{ id: number }>(
            `
                INSERT INTO
                    grupo_resumo (
                        created_date,
                        updated_date,
                        is_deleted,
                        grupo_id,
                        usuario_id,
                        inicio_data,
                        fim_data,
                        enviou_codigo,
                        quantidade_mensagens,
                        texto,
                        modelo,
                        tokens_entrada,
                        tokens_saida
                    )
                SELECT
                    NOW(),
                    NOW(),
                    false,
                    :grupoId,
                    :usuarioId,
                    CAST(:inicioData AS timestamptz),
                    CAST(:fimData AS timestamptz),
                    :enviouCodigo,
                    :quantidadeMensagens,
                    :texto,
                    :modelo,
                    :tokensEntrada,
                    :tokensSaida
                RETURNING
                    id
            `,
            { ...dto, inicioData: dto.inicioData.toISOString(), fimData: dto.fimData.toISOString() },
        );
        return (await this.recuperarResumo({ resumoId: criados[0].id, grupoId: dto.grupoId })) as GrupoResumoIaRegistrado;
    }

    /** O resumo com esse id **neste grupo**; `null` quando não existe ou é de outro grupo. */
    async recuperarResumo(dto: GrupoResumoIaInternoRecuperarDto): Promise<GrupoResumoIaRegistrado | null> {
        const encontrados = await this.executarConsulta<GrupoResumoIaRegistrado>(
            `
                SELECT
                    ${COLUNAS}
                FROM
                    grupo_resumo
                WHERE
                    grupo_resumo.id = :resumoId
                    AND grupo_resumo.grupo_id = :grupoId
                    AND grupo_resumo.is_deleted = false
            `,
            { resumoId: dto.resumoId, grupoId: dto.grupoId },
        );
        return encontrados[0] ?? null;
    }

    /** O resumo mais recente do grupo, pelo fim do período (empate pelo mais novo criado). */
    async recuperarUltimoResumo(dto: GrupoResumoIaUltimoRecuperarDto): Promise<GrupoResumoIaRegistrado | null> {
        const encontrados = await this.executarConsulta<GrupoResumoIaRegistrado>(
            `
                SELECT
                    ${COLUNAS}
                FROM
                    grupo_resumo
                WHERE
                    grupo_resumo.grupo_id = :grupoId
                    AND grupo_resumo.is_deleted = false
                ORDER BY
                    grupo_resumo.fim_data DESC,
                    grupo_resumo.id DESC
                LIMIT
                    1
            `,
            { grupoId: dto.grupoId },
        );
        return encontrados[0] ?? null;
    }

    /** Os resumos do grupo, do mais recente para o mais antigo, com o nome de quem pediu (`null` se a pessoa foi excluída). */
    async listarResumos(dto: GrupoResumoIaListarDto): Promise<(GrupoResumoIaRegistrado & { criadoData: Date; nomeDoUsuario: string | null })[]> {
        return this.executarConsulta(
            `
                SELECT
                    ${COLUNAS},
                    grupo_resumo.created_date AS "criadoData",
                    usuario.nome_completo AS "nomeDoUsuario"
                FROM
                    grupo_resumo
                    LEFT JOIN usuario ON usuario.id = grupo_resumo.usuario_id
                    AND usuario.is_deleted = false
                WHERE
                    grupo_resumo.grupo_id = :grupoId
                    AND grupo_resumo.is_deleted = false
                ORDER BY
                    grupo_resumo.created_date DESC,
                    grupo_resumo.id DESC
                LIMIT
                    :limite
            `,
            { grupoId: dto.grupoId, limite: LIMITE_DE_RESUMOS_NO_HISTORICO },
        );
    }

    /** Guarda a proposta de gravar e a demanda de destino; `false` se o resumo não existe ou já foi gravado. */
    async marcarProposta(dto: GrupoResumoIaPropostaInternoMarcarDto): Promise<boolean> {
        const alterados = await this.executarConsulta<{ id: number }>(
            `
                UPDATE grupo_resumo
                SET
                    proposta_ia_id = :propostaIaId,
                    demanda_id = :demandaId,
                    updated_date = NOW()
                WHERE
                    id = :resumoId
                    AND gravada_data IS NULL
                    AND is_deleted = false
                RETURNING
                    id
            `,
            { ...dto },
        );
        return alterados.length > 0;
    }

    /** Marca o resumo como gravado na documentação; `false` se não existe ou já estava gravado (a gravação é uma vez só). */
    async marcarGravado(dto: GrupoResumoIaGravadoInternoMarcarDto): Promise<boolean> {
        const alterados = await this.executarConsulta<{ id: number }>(
            `
                UPDATE grupo_resumo
                SET
                    gravada_data = CAST(:gravadaData AS timestamptz),
                    updated_date = NOW()
                WHERE
                    id = :resumoId
                    AND gravada_data IS NULL
                    AND is_deleted = false
                RETURNING
                    id
            `,
            { resumoId: dto.resumoId, gravadaData: dto.gravadaData.toISOString() },
        );
        return alterados.length > 0;
    }
}
