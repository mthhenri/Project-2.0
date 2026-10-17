import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Prompt } from '../domain/models/prompt.model';
import { PromptListarDto, PromptResumoDto, PromptTipoResumoDto, TipoPromptEnum } from '@project20/shared';

const COLUNAS_RESUMO = `
         prompt.id,
         tipo_prompt.codigo       AS tipo,
         prompt.versao,
         prompt.conteudo,
         prompt.ativo,
         prompt.rascunho,
         prompt.usuario_id        AS "usuarioId",
         usuario.nome_completo    AS "usuarioNome",
         prompt.created_date      AS "createdDate"`;

const JUNCOES_RESUMO = `
       FROM prompt
       INNER JOIN tipo_prompt
          ON tipo_prompt.id = prompt.tipo_prompt_id
         AND tipo_prompt.is_deleted = false
       INNER JOIN usuario
          ON usuario.id = prompt.usuario_id`;

@Injectable()
export class PromptRepository extends BaseRepository<Prompt> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'prompt');
  }

  /** Os tipos com a versão ativa e o rascunho (se houver). */
  async listarTipos(): Promise<PromptTipoResumoDto[]> {
    const tipos = await this.executarConsulta<{ tipo: TipoPromptEnum; descricao: string }>(
      `SELECT tipo_prompt.codigo AS tipo, tipo_prompt.descricao
       FROM tipo_prompt
       WHERE tipo_prompt.is_deleted = false
       ORDER BY tipo_prompt.id ASC`,
    );
    const vigentes = await this.executarConsulta<PromptResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE prompt.is_deleted = false
         AND (prompt.ativo = true OR prompt.rascunho = true)`,
    );
    return tipos.map((tipo) => ({
      tipo: tipo.tipo,
      descricao: tipo.descricao,
      ativa: vigentes.find((vigente) => vigente.tipo === tipo.tipo && vigente.ativo) as PromptResumoDto,
      rascunho: vigentes.find((vigente) => vigente.tipo === tipo.tipo && vigente.rascunho) ?? null,
    }));
  }

  async recuperarAtivo(tipo: TipoPromptEnum): Promise<PromptResumoDto | undefined> {
    const encontrados = await this.executarConsulta<PromptResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE prompt.is_deleted = false
         AND prompt.ativo = true
         AND tipo_prompt.codigo = :tipo`,
      { tipo },
    );
    return encontrados[0];
  }

  async listarVersoes(tipo: TipoPromptEnum, dto: PromptListarDto): Promise<{ itens: PromptResumoDto[]; total: number }> {
    const pagina = dto.pagina ?? 1;
    const itensPorPagina = dto.itensPorPagina ?? 20;
    const totais = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM prompt
       INNER JOIN tipo_prompt ON tipo_prompt.id = prompt.tipo_prompt_id
       WHERE prompt.is_deleted = false AND tipo_prompt.codigo = :tipo`,
      { tipo },
    );
    const itens = await this.executarConsulta<PromptResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE prompt.is_deleted = false AND tipo_prompt.codigo = :tipo
       ORDER BY prompt.versao DESC
       LIMIT :limite OFFSET :deslocamento`,
      { tipo, limite: itensPorPagina, deslocamento: (pagina - 1) * itensPorPagina },
    );
    return { itens, total: parseInt(totais[0].total, 10) };
  }

  /**
   * Cria o rascunho do tipo ou, se já existe, troca o texto dele (rascunho não é versão publicada). A transação trava a
   * linha do tipo, então duas operações do mesmo tipo nunca se cruzam.
   */
  async salvarRascunho(tipo: TipoPromptEnum, conteudo: string, usuarioId: number): Promise<PromptResumoDto> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      await this.travarTipo(tipo, transacao);
      const atualizados = await this.executarConsulta<{ id: number }>(
        `UPDATE prompt
         SET conteudo = :conteudo, usuario_id = :usuarioId
         FROM tipo_prompt
         WHERE tipo_prompt.id = prompt.tipo_prompt_id
           AND tipo_prompt.codigo = :tipo
           AND prompt.rascunho = true
           AND prompt.is_deleted = false
         RETURNING prompt.id`,
        { tipo, conteudo, usuarioId },
        transacao,
      );
      let id = atualizados[0]?.id;
      if (id === undefined) {
        const inseridos = await this.executarConsulta<{ id: number }>(
          `INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
           SELECT tipo_prompt.id,
                  COALESCE((SELECT MAX(prompt.versao) FROM prompt WHERE prompt.tipo_prompt_id = tipo_prompt.id AND prompt.is_deleted = false), 0) + 1,
                  :conteudo, false, true, :usuarioId, NOW(), NOW(), false
           FROM tipo_prompt
           WHERE tipo_prompt.codigo = :tipo AND tipo_prompt.is_deleted = false
           RETURNING id`,
          { tipo, conteudo, usuarioId },
          transacao,
        );
        id = inseridos[0].id;
      }
      return this.recuperarPorId(id, transacao);
    });
  }

  /** Promove o rascunho a ativo e a ativa anterior deixa de ser ativa. `undefined` se não há rascunho. */
  async ativarRascunho(tipo: TipoPromptEnum): Promise<PromptResumoDto | undefined> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      await this.travarTipo(tipo, transacao);
      const rascunhos = await this.executarConsulta<{ id: number }>(
        `SELECT prompt.id
         FROM prompt
         INNER JOIN tipo_prompt ON tipo_prompt.id = prompt.tipo_prompt_id
         WHERE tipo_prompt.codigo = :tipo AND prompt.rascunho = true AND prompt.is_deleted = false`,
        { tipo },
        transacao,
      );
      if (rascunhos.length === 0) return undefined;
      await this.desativarAtivas(tipo, transacao);
      await this.executarComando(
        `UPDATE prompt SET ativo = true, rascunho = false WHERE prompt.id = :id`,
        { id: rascunhos[0].id },
        transacao,
      );
      return this.recuperarPorId(rascunhos[0].id, transacao);
    });
  }

  /** Reativa a versão 1 (o padrão) e a ativa anterior deixa de ser ativa. `undefined` se o tipo não tem versão 1. */
  async restaurarPadrao(tipo: TipoPromptEnum): Promise<PromptResumoDto | undefined> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      await this.travarTipo(tipo, transacao);
      const padroes = await this.executarConsulta<{ id: number }>(
        `SELECT prompt.id
         FROM prompt
         INNER JOIN tipo_prompt ON tipo_prompt.id = prompt.tipo_prompt_id
         WHERE tipo_prompt.codigo = :tipo AND prompt.versao = 1 AND prompt.is_deleted = false`,
        { tipo },
        transacao,
      );
      if (padroes.length === 0) return undefined;
      await this.desativarAtivas(tipo, transacao);
      await this.executarComando(`UPDATE prompt SET ativo = true WHERE prompt.id = :id`, { id: padroes[0].id }, transacao);
      return this.recuperarPorId(padroes[0].id, transacao);
    });
  }

  /** Descarta o rascunho (soft delete). `false` se não havia. */
  async descartarRascunho(tipo: TipoPromptEnum): Promise<boolean> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      await this.travarTipo(tipo, transacao);
      const descartados = await this.executarConsulta<{ id: number }>(
        `UPDATE prompt
         SET is_deleted = true, deleted_date = NOW(), rascunho = false
         FROM tipo_prompt
         WHERE tipo_prompt.id = prompt.tipo_prompt_id
           AND tipo_prompt.codigo = :tipo
           AND prompt.rascunho = true
           AND prompt.is_deleted = false
         RETURNING prompt.id`,
        { tipo },
        transacao,
      );
      return descartados.length > 0;
    });
  }

  /** Trava a linha do tipo até o fim da transação: operações do mesmo tipo passam uma de cada vez. */
  private async travarTipo(tipo: TipoPromptEnum, transacao: Knex.Transaction): Promise<void> {
    await this.executarComando(
      `SELECT tipo_prompt.id FROM tipo_prompt WHERE tipo_prompt.codigo = :tipo AND tipo_prompt.is_deleted = false FOR UPDATE`,
      { tipo },
      transacao,
    );
  }

  private async desativarAtivas(tipo: TipoPromptEnum, transacao: Knex.Transaction): Promise<void> {
    await this.executarComando(
      `UPDATE prompt
       SET ativo = false
       FROM tipo_prompt
       WHERE tipo_prompt.id = prompt.tipo_prompt_id
         AND tipo_prompt.codigo = :tipo
         AND prompt.ativo = true
         AND prompt.is_deleted = false`,
      { tipo },
      transacao,
    );
  }

  private async recuperarPorId(id: number, transacao: Knex.Transaction): Promise<PromptResumoDto> {
    const encontrados = await this.executarConsulta<PromptResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE prompt.id = :id`,
      { id },
      transacao,
    );
    return encontrados[0];
  }
}
