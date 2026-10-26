import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import {
  PlanoFonteCriadoDto,
  PlanoFonteExcluidaDto,
  PlanoFonteExcluirDto,
  PlanoFonteInternoCriarDto,
  PlanoFonteListarDto,
  PlanoFonteRecuperadaDto,
  PlanoFonteRecuperarDto,
  PlanoFonteResumoDto,
} from '@project20/shared';
import { BaseEntity } from '../../../core/base/base.entity';

const COLUNAS_RESUMO = `
  plano_fonte.id,
  plano_fonte.plano_id              AS "planoId",
  plano_fonte.titulo,
  tipo_plano_fonte_origem.codigo    AS origem,
  plano_fonte.usuario_id            AS "usuarioId",
  usuario.nome_completo             AS "usuarioNome",
  CHAR_LENGTH(plano_fonte.conteudo) AS tamanho,
  plano_fonte.created_date          AS "createdDate"`;

const JUNCAO = `
  FROM plano_fonte
  INNER JOIN tipo_plano_fonte_origem
    ON tipo_plano_fonte_origem.id = plano_fonte.tipo_plano_fonte_origem_id
   AND tipo_plano_fonte_origem.is_deleted = false
  INNER JOIN usuario
    ON usuario.id = plano_fonte.usuario_id`;

/** Fontes (material de fora) de um plano (task 236). Só SQL; o acesso e a validação do conteúdo ficam na service. */
@Injectable()
export class PlanoFonteRepository extends BaseRepository<BaseEntity> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'plano_fonte');
  }

  async inserir(dto: PlanoFonteInternoCriarDto): Promise<PlanoFonteCriadoDto> {
    const resultado = await this.executarConsulta<PlanoFonteCriadoDto>(
      `INSERT INTO plano_fonte (plano_id, titulo, conteudo, tipo_plano_fonte_origem_id, usuario_id, created_date, updated_date, is_deleted)
       SELECT :planoId, :titulo, :conteudo,
              (SELECT tipo_plano_fonte_origem.id FROM tipo_plano_fonte_origem WHERE tipo_plano_fonte_origem.codigo = :origem AND tipo_plano_fonte_origem.is_deleted = false),
              :usuarioId, NOW(), NOW(), false
       RETURNING id, plano_id AS "planoId", titulo, CAST(:origem AS text) AS origem`,
      { planoId: dto.planoId, titulo: dto.titulo, conteudo: dto.conteudo, origem: dto.origem, usuarioId: dto.usuarioId },
    );
    return resultado[0];
  }

  /** As fontes do plano, da mais antiga para a mais nova (sem o conteúdo). O nome de quem trouxe vem mesmo se a pessoa foi excluída depois. */
  async listar(dto: PlanoFonteListarDto): Promise<PlanoFonteResumoDto[]> {
    return this.executarConsulta<PlanoFonteResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCAO}
       WHERE plano_fonte.plano_id = :planoId AND plano_fonte.is_deleted = false
       ORDER BY plano_fonte.id ASC`,
      { planoId: dto.planoId },
    );
  }

  /** As fontes do plano com o conteúdo, para a IA ler. */
  async listarComConteudo(dto: PlanoFonteListarDto): Promise<PlanoFonteRecuperadaDto[]> {
    return this.executarConsulta<PlanoFonteRecuperadaDto>(
      `SELECT ${COLUNAS_RESUMO}, plano_fonte.conteudo
       ${JUNCAO}
       WHERE plano_fonte.plano_id = :planoId AND plano_fonte.is_deleted = false
       ORDER BY plano_fonte.id ASC`,
      { planoId: dto.planoId },
    );
  }

  /** A fonte do plano pedido, com o conteúdo, ou `null` (de outro plano também é `null`). */
  async recuperar(dto: PlanoFonteRecuperarDto): Promise<PlanoFonteRecuperadaDto | null> {
    const resultado = await this.executarConsulta<PlanoFonteRecuperadaDto>(
      `SELECT ${COLUNAS_RESUMO}, plano_fonte.conteudo
       ${JUNCAO}
       WHERE plano_fonte.id = :id AND plano_fonte.plano_id = :planoId AND plano_fonte.is_deleted = false
       LIMIT 1`,
      { id: dto.id, planoId: dto.planoId },
    );
    return resultado[0] ?? null;
  }

  /** Quantas fontes ativas o plano tem (para o teto por plano). */
  async contar(dto: PlanoFonteListarDto): Promise<number> {
    const resultado = await this.executarConsulta<{ total: number }>(
      `SELECT CAST(COUNT(*) AS integer) AS total
       FROM plano_fonte
       WHERE plano_fonte.plano_id = :planoId AND plano_fonte.is_deleted = false`,
      { planoId: dto.planoId },
    );
    return resultado[0].total;
  }

  /** Soft delete: a fonte some da lista e do contexto da IA. `null` se não é do plano. */
  async excluir(dto: PlanoFonteExcluirDto): Promise<PlanoFonteExcluidaDto | null> {
    const resultado = await this.executarConsulta<PlanoFonteExcluidaDto>(
      `UPDATE plano_fonte
       SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
       WHERE id = :id AND plano_id = :planoId AND is_deleted = false
       RETURNING id`,
      { id: dto.id, planoId: dto.planoId },
    );
    return resultado[0] ?? null;
  }
}
