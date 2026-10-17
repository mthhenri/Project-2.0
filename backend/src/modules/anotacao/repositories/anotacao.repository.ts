import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Anotacao } from '../domain/models/anotacao.model';
import { AnotacaoListarDto, AnotacaoResumoDto, TipoAnotacaoEnum } from '@project20/shared';

/** Quais seções do usuário uma operação vai ler (e travar) dentro da transação. */
export interface AnotacaoSecoesModificarDados {
  usuarioId: number;
  tipos: TipoAnotacaoEnum[];
}

/** Texto novo de uma seção, devolvido por quem decide a modificação. */
export interface AnotacaoTextoNovo {
  tipo: TipoAnotacaoEnum;
  texto: string;
}

const COLUNAS_RESUMO = `
         anotacao.id,
         anotacao.usuario_id     AS "usuarioId",
         tipo_anotacao.codigo    AS tipo,
         anotacao.texto,
         anotacao.updated_date   AS "updatedDate"`;

@Injectable()
export class AnotacaoRepository extends BaseRepository<Anotacao> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'anotacao');
  }

  /** Seções do usuário na ordem de exibição; com `tipos`, só essas. */
  async listar(dto: AnotacaoListarDto): Promise<AnotacaoResumoDto[]> {
    const parametros: Record<string, unknown> = { usuarioId: dto.usuarioId };
    let filtroTipos = '';
    if (dto.tipos && dto.tipos.length > 0) {
      filtroTipos = 'AND tipo_anotacao.codigo = ANY(:tipos)';
      parametros.tipos = dto.tipos;
    }

    return this.executarConsulta<AnotacaoResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       FROM anotacao
       INNER JOIN tipo_anotacao
          ON tipo_anotacao.id = anotacao.tipo_anotacao_id
         AND tipo_anotacao.is_deleted = false
       WHERE anotacao.usuario_id = :usuarioId
         AND anotacao.is_deleted = false
         ${filtroTipos}
       ORDER BY tipo_anotacao.ordem ASC`,
      parametros,
    );
  }

  /**
   * Lê e trava as seções pedidas, entrega-as a `modificador` e grava os textos que ele devolver, tudo numa
   * transação. Se `modificador` lançar, nada é gravado. As seções vêm na ordem de exibição (a mesma ordem de
   * travamento em toda operação, para duas operações simultâneas não travarem uma à outra).
   * Devolve as seções gravadas, na ordem em que o modificador as devolveu.
   */
  async modificarSecoes(
    dados: AnotacaoSecoesModificarDados,
    modificador: (atuais: AnotacaoResumoDto[]) => AnotacaoTextoNovo[],
  ): Promise<AnotacaoResumoDto[]> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      const atuais = await this.executarConsulta<AnotacaoResumoDto>(
        `SELECT ${COLUNAS_RESUMO}
         FROM anotacao
         INNER JOIN tipo_anotacao
            ON tipo_anotacao.id = anotacao.tipo_anotacao_id
           AND tipo_anotacao.is_deleted = false
         WHERE anotacao.usuario_id = :usuarioId
           AND anotacao.is_deleted = false
           AND tipo_anotacao.codigo = ANY(:tipos)
         ORDER BY tipo_anotacao.ordem ASC
         FOR UPDATE OF anotacao`,
        { usuarioId: dados.usuarioId, tipos: dados.tipos },
        transacao,
      );

      const novos = modificador(atuais);
      const gravadas: AnotacaoResumoDto[] = [];
      for (const novo of novos) {
        const resultado = await this.executarConsulta<AnotacaoResumoDto>(
          `UPDATE anotacao
           SET texto        = :texto,
               updated_date = NOW()
           FROM tipo_anotacao
           WHERE tipo_anotacao.id = anotacao.tipo_anotacao_id
             AND tipo_anotacao.codigo = :tipo
             AND anotacao.usuario_id = :usuarioId
             AND anotacao.is_deleted = false
           RETURNING ${COLUNAS_RESUMO}`,
          { texto: novo.texto, tipo: novo.tipo, usuarioId: dados.usuarioId },
          transacao,
        );
        gravadas.push(resultado[0]);
      }
      return gravadas;
    });
  }
}
