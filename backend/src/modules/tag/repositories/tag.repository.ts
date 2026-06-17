import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Tag } from '../domain/models/tag.model';
import {
  TagCriadaDto,
  TagRecuperadaDto,
  TagResumoDto,
  TagAlteradaDto,
  TagValidarNomeDto,
  TagRecuperarDto,
  TagExcluirDto,
} from '@project20/shared';

@Injectable()
export class TagRepository extends BaseRepository<Tag> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'tag');
  }

  /** Verifica se já existe tag ativa com o mesmo nome, opcionalmente excluindo um ID. */
  async validarNome(dto: TagValidarNomeDto): Promise<boolean> {
    const clausulaExcluirId = dto.idExcluir !== undefined
      ? 'AND tag.id <> :idExcluir'
      : '';

    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM tag
         WHERE tag.nome = :nome
           AND tag.is_deleted = false
           ${clausulaExcluirId}
       ) AS existe`,
      { nome: dto.nome, idExcluir: dto.idExcluir },
    );
    return resultado[0].existe;
  }

  /** Insere nova tag e retorna os dados da tag criada. */
  async inserir(dados: { nome: string; cor: string }): Promise<TagCriadaDto> {
    const resultado = await this.executarConsulta<TagCriadaDto>(
      `INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
       SELECT :nome, :cor, NOW(), NOW(), false
       RETURNING
         id,
         nome,
         cor,
         created_date AS "createdDate"`,
      { nome: dados.nome, cor: dados.cor },
    );
    return resultado[0];
  }

  /** Recupera tag por ID. Retorna null se não encontrada ou deletada. */
  async recuperar(dto: TagRecuperarDto): Promise<TagRecuperadaDto | null> {
    const resultado = await this.executarConsulta<TagRecuperadaDto>(
      `SELECT
         tag.id,
         tag.nome,
         tag.cor,
         tag.created_date AS "createdDate"
       FROM tag
       WHERE tag.id = :id
         AND tag.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /** Lista todas as tags ativas ordenadas por nome. */
  async listar(): Promise<TagResumoDto[]> {
    return this.executarConsulta<TagResumoDto>(
      `SELECT
         tag.id,
         tag.nome,
         tag.cor
       FROM tag
       WHERE tag.is_deleted = false
       ORDER BY tag.nome ASC`,
    );
  }

  /** Altera campos da tag e retorna os dados alterados. */
  async alterar(id: number, dados: Partial<Tag>): Promise<TagAlteradaDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id };

    if (dados.nome !== undefined) {
      setClauses.push('nome = :nome');
      parametros.nome = dados.nome;
    }
    if (dados.cor !== undefined) {
      setClauses.push('cor = :cor');
      parametros.cor = dados.cor;
    }

    const resultado = await this.executarConsulta<TagAlteradaDto>(
      `UPDATE tag
       SET ${setClauses.join(', ')}
       WHERE tag.id = :id
         AND tag.is_deleted = false
       RETURNING
         id,
         nome,
         cor,
         created_date AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Soft delete da tag. */
  async excluir(dto: TagExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
