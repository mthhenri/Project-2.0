import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Atividade } from '../domain/models/atividade.model';
import {
  AtividadeCriadaDto,
  AtividadeRecuperadaDto,
  AtividadeAlteradaDto,
  AtividadeResumoDto,
  AtividadeListarDto,
  TagResumoDto,
  AtividadeRecuperarDto,
  AtividadeExcluirDto,
  AtividadeTagsListarDto,
  AtividadeTagsAlterarDto,
  DemandaAcessoVerificarDto,
} from '@project20/shared';

type AtividadeInserirDados = Omit<Atividade, 'id' | 'isDeleted' | 'createdDate' | 'updatedDate' | 'deletedDate'>;

@Injectable()
export class AtividadeRepository extends BaseRepository<Atividade> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'atividade');
  }

  /**
   * Insere nova atividade e retorna os dados criados.
   */
  async inserir(dados: AtividadeInserirDados): Promise<AtividadeCriadaDto> {
    const resultado = await this.executarConsulta<AtividadeCriadaDto>(
      `INSERT INTO atividade (demanda_id, usuario_id, nome, descricao, status, ordem_exibicao, created_date, updated_date, is_deleted)
       SELECT :demandaId, :usuarioId, :nome, :descricao, :status, :ordemExibicao, NOW(), NOW(), false
       RETURNING
         id,
         demanda_id      AS "demandaId",
         usuario_id      AS "usuarioId",
         nome,
         descricao,
         status,
         ordem_exibicao  AS "ordemExibicao",
         created_date    AS "createdDate"`,
      {
        demandaId:     dados.demandaId,
        usuarioId:     dados.usuarioId,
        nome:          dados.nome,
        descricao:     dados.descricao ?? null,
        status:        dados.status,
        ordemExibicao: dados.ordemExibicao,
      },
    );
    return resultado[0];
  }

  /**
   * Recupera atividade por ID com JOIN ao usuário executor.
   * Retorna null se não encontrada ou deletada.
   */
  async recuperar(dto: AtividadeRecuperarDto): Promise<AtividadeRecuperadaDto | null> {
    const resultado = await this.executarConsulta<AtividadeRecuperadaDto>(
      `SELECT
         atividade.id,
         atividade.demanda_id      AS "demandaId",
         atividade.usuario_id      AS "usuarioId",
         usuario.nome_completo     AS "nomeUsuario",
         atividade.nome,
         atividade.descricao,
         atividade.status,
         atividade.ordem_exibicao  AS "ordemExibicao",
         atividade.created_date    AS "createdDate"
       FROM atividade
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
         AND usuario.is_deleted = false
       WHERE atividade.id = :id
         AND atividade.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista atividades de uma demanda com paginação e filtro opcional de status.
   */
  async listar(
    filtros: AtividadeListarDto,
  ): Promise<{ itens: AtividadeResumoDto[]; total: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = { demandaId: filtros.demandaId };
    const condicoes: string[] = [
      'atividade.is_deleted = false',
      'atividade.demanda_id = :demandaId',
    ];

    if (filtros.status !== undefined) {
      condicoes.push('atividade.status = :status');
      parametros.status = filtros.status;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(atividade.id)::int AS total
       FROM atividade
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<AtividadeResumoDto>(
      `SELECT
         atividade.id,
         atividade.nome,
         atividade.status,
         atividade.ordem_exibicao  AS "ordemExibicao",
         atividade.usuario_id      AS "usuarioId",
         usuario.nome_completo     AS "nomeUsuario"
       FROM atividade
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
         AND usuario.is_deleted = false
       WHERE ${clausulaWhere}
       ORDER BY atividade.ordem_exibicao ASC, atividade.nome ASC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Altera campos da atividade e retorna o estado alterado.
   */
  async alterar(id: number, dados: Partial<Atividade>): Promise<AtividadeAlteradaDto> {
    const setClauses: string[] = ['atividade.updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id };

    if (dados.nome !== undefined) {
      setClauses.push('nome = :nome');
      parametros.nome = dados.nome;
    }
    if (dados.descricao !== undefined) {
      setClauses.push('descricao = :descricao');
      parametros.descricao = dados.descricao;
    }
    if (dados.status !== undefined) {
      setClauses.push('status = :status');
      parametros.status = dados.status;
    }
    if (dados.ordemExibicao !== undefined) {
      setClauses.push('ordem_exibicao = :ordemExibicao');
      parametros.ordemExibicao = dados.ordemExibicao;
    }

    const resultado = await this.executarConsulta<AtividadeAlteradaDto>(
      `UPDATE atividade
       SET ${setClauses.join(', ')}
       WHERE atividade.id = :id
         AND atividade.is_deleted = false
       RETURNING
         id,
         demanda_id      AS "demandaId",
         usuario_id      AS "usuarioId",
         nome,
         descricao,
         status,
         ordem_exibicao  AS "ordemExibicao",
         created_date    AS "createdDate"`,
      parametros,
    );

    const atividadeAlterada = resultado[0];

    const usuarioResultado = await this.executarConsulta<{ nomeCompleto: string }>(
      `SELECT nome_completo AS "nomeCompleto"
       FROM usuario
       WHERE id = :usuarioId
         AND is_deleted = false
       LIMIT 1`,
      { usuarioId: atividadeAlterada.usuarioId },
    );

    return {
      ...atividadeAlterada,
      nomeUsuario: usuarioResultado[0]?.nomeCompleto ?? '',
    };
  }

  /** Soft delete da atividade. */
  async excluir(dto: AtividadeExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Verifica se o usuário está atribuído à demanda via demanda_usuario.
   * Usado para controle de acesso na criação e atualização de atividades.
   */
  async validarAcessoDemanda(dto: DemandaAcessoVerificarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM demanda_usuario
         WHERE demanda_usuario.demanda_id = :demandaId
           AND demanda_usuario.usuario_id = :usuarioId
           AND demanda_usuario.is_deleted = false
       ) AS existe`,
      { demandaId: dto.demandaId, usuarioId: dto.usuarioId },
    );
    return resultado[0].existe;
  }

  /**
   * Lista as tags ativas atribuídas a uma atividade.
   */
  async listarTags(dto: AtividadeTagsListarDto): Promise<TagResumoDto[]> {
    return this.executarConsulta<TagResumoDto>(
      `SELECT
         tag.id,
         tag.nome,
         tag.cor
       FROM atividade_tag
       INNER JOIN tag
         ON tag.id = atividade_tag.tag_id
         AND tag.is_deleted = false
       WHERE atividade_tag.atividade_id = :atividadeId
         AND atividade_tag.is_deleted = false`,
      { atividadeId: dto.atividadeId },
    );
  }

  /**
   * Sincroniza as tags de uma atividade com a nova lista de IDs.
   * Faz soft delete das tags removidas e insere as novas.
   * Tags que já existem e permanecem na lista não são tocadas.
   */
  async alterarTags(dto: AtividadeTagsAlterarDto): Promise<void> {
    const tagsAtuais = await this.listarTags({ atividadeId: dto.atividadeId });
    const idsAtuais  = tagsAtuais.map((tag) => tag.id);

    const idsParaRemover = idsAtuais.filter((id) => !dto.tagIds.includes(id));
    const idsParaInserir = dto.tagIds.filter((id) => !idsAtuais.includes(id));

    for (const tagId of idsParaRemover) {
      await this.executarComando(
        `UPDATE atividade_tag
         SET is_deleted   = true,
             deleted_date = NOW(),
             updated_date = NOW()
         WHERE atividade_id = :atividadeId
           AND tag_id       = :tagId
           AND is_deleted   = false`,
        { atividadeId: dto.atividadeId, tagId },
      );
    }

    for (const tagId of idsParaInserir) {
      await this.executarComando(
        `INSERT INTO atividade_tag (atividade_id, tag_id, created_date, updated_date, is_deleted)
         SELECT :atividadeId, :tagId, NOW(), NOW(), false`,
        { atividadeId: dto.atividadeId, tagId },
      );
    }
  }
}
