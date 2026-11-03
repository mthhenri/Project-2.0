import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TipoUsuarioAjudaInternoAlterarDto, TipoUsuarioAjudaResumoDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** O texto de ajuda de cada tipo de usuário (task 308): Markdown na coluna `tipo_usuario.ajuda_markdown`. */
@Injectable()
export class TipoUsuarioAjudaRepository extends BaseRepository<TipoUsuarioAjudaResumoDto> {
    constructor(@Inject(DATABASE_CONNECTION) conexao: Knex) {
        super(conexao, 'tipo_usuario');
    }

    /** Os tipos com o texto atual, na ordem de cadastro. */
    async listar(): Promise<TipoUsuarioAjudaResumoDto[]> {
        return this.executarConsulta<TipoUsuarioAjudaResumoDto>(`
            SELECT
                tipo_usuario.codigo AS tipo,
                tipo_usuario.ajuda_markdown AS texto
            FROM
                tipo_usuario
            WHERE
                tipo_usuario.is_deleted = false
            ORDER BY
                tipo_usuario.id
        `);
    }

    /** Troca o texto de um tipo. Devolve `false` se o tipo não existe. */
    async alterar(dto: TipoUsuarioAjudaInternoAlterarDto): Promise<boolean> {
        const alterados = await this.executarConsulta<{ id: number }>(
            `
                UPDATE tipo_usuario
                SET
                    ajuda_markdown = :texto,
                    updated_date = NOW()
                WHERE
                    tipo_usuario.codigo = :tipo
                    AND tipo_usuario.is_deleted = false
                RETURNING
                    tipo_usuario.id
            `,
            { texto: dto.texto, tipo: dto.tipo },
        );
        return alterados.length > 0;
    }
}
