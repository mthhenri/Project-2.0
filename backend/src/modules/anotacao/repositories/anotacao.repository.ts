import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Anotacao } from '../domain/models/anotacao.model';
import { AnotacaoListarDto, AnotacaoResumoDto, TipoAnotacaoEnum, TipoUsuarioEnum } from '@project20/shared';

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

  /**
   * Cria as seções que o usuário ainda não tem (o cadastro pela `UsuarioService` já cria as cinco; quem entrou por SQL ou script não tem
   * nenhuma e o pad não abria). Idempotente e seguro com duas chamadas ao mesmo tempo (o índice único descarta a repetida). Usuário
   * inexistente ou excluído não ganha nada. Devolve quantas seções criou.
   */
  async criarSecoesFaltantes(dados: { usuarioId: number }, transacao?: Knex.Transaction): Promise<number> {
    const criadas = await this.executarConsulta<{ id: number }>(
      `INSERT INTO anotacao (usuario_id, tipo_anotacao_id, texto, created_date, updated_date, is_deleted)
       SELECT usuario.id, tipo_anotacao.id, '', NOW(), NOW(), false
       FROM usuario
       CROSS JOIN tipo_anotacao
       WHERE usuario.id = :usuarioId
         AND usuario.is_deleted = false
         AND tipo_anotacao.is_deleted = false
       ON CONFLICT (usuario_id, tipo_anotacao_id) WHERE is_deleted = false DO NOTHING
       RETURNING id`,
      { usuarioId: dados.usuarioId },
      transacao,
    );
    return criadas.length;
  }

  /** O tipo do dono do pad (quem decide quem pode abri-lo); `null` se o usuário não existe ou foi excluído. */
  async recuperarTipoDoDono(dados: { usuarioId: number }): Promise<TipoUsuarioEnum | null> {
    const [encontrado] = await this.executarConsulta<{ tipo: TipoUsuarioEnum }>(
      `SELECT tipo_usuario.codigo AS tipo
       FROM usuario
       INNER JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id AND tipo_usuario.is_deleted = false
       WHERE usuario.id = :usuarioId AND usuario.is_deleted = false`,
      { usuarioId: dados.usuarioId },
    );
    return encontrado?.tipo ?? null;
  }

  /** Seções do usuário na ordem de exibição; com `tipos`, só essas. Usuário sem nenhuma seção ganha as cinco vazias e elas voltam. */
  async listar(dto: AnotacaoListarDto): Promise<AnotacaoResumoDto[]> {
    const itens = await this.lerSecoes(dto);
    if (itens.length > 0 || (await this.criarSecoesFaltantes({ usuarioId: dto.usuarioId })) === 0) return itens;
    return this.lerSecoes(dto);
  }

  private async lerSecoes(dto: AnotacaoListarDto): Promise<AnotacaoResumoDto[]> {
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
      const lerETravar = () =>
        this.executarConsulta<AnotacaoResumoDto>(
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
      let atuais = await lerETravar();
      // Quem nunca teve o pad (entrou por SQL ou script) não deve levar 404 ao anotar: as seções vazias nascem aqui, na mesma transação.
      if (atuais.length === 0 && (await this.criarSecoesFaltantes({ usuarioId: dados.usuarioId }, transacao)) > 0) atuais = await lerETravar();

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
