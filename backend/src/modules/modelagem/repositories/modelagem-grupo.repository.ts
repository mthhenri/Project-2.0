import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  ModelagemGrupoDto,
  ModelagemGrupoExcluirDto,
  ModelagemGrupoInternoAlterarDto,
  ModelagemGrupoInternoCriarDto,
  ModelagemGrupoRecuperarDto,
  ModelagemGrupoValidarRotuloDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

const COLUNAS_DO_GRUPO = `modelagem_grupo.id,
       modelagem_grupo.titulo,
       modelagem_grupo.rotulo,
       modelagem_grupo.cor_indice AS "corIndice"`;

/** Grupos do diagrama da tela Modelagem (`modelagem_grupo`). */
@Injectable()
export class ModelagemGrupoRepository extends BaseRepository<ModelagemGrupoDto> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'modelagem_grupo');
  }

  async listar(): Promise<ModelagemGrupoDto[]> {
    return this.executarConsulta<ModelagemGrupoDto>(
      `SELECT ${COLUNAS_DO_GRUPO}
         FROM modelagem_grupo
        WHERE modelagem_grupo.is_deleted = false
        ORDER BY modelagem_grupo.ordem, modelagem_grupo.id`,
    );
  }

  async recuperar(dto: ModelagemGrupoRecuperarDto): Promise<ModelagemGrupoDto | null> {
    const encontrados = await this.executarConsulta<ModelagemGrupoDto>(
      `SELECT ${COLUNAS_DO_GRUPO}
         FROM modelagem_grupo
        WHERE modelagem_grupo.id = :id
          AND modelagem_grupo.is_deleted = false`,
      { id: dto.id },
    );
    return encontrados[0] ?? null;
  }

  /** A maior `ordem` ativa (0 sem grupos), para o grupo novo entrar no fim. */
  async obterMaiorOrdem(): Promise<number> {
    const linhas = await this.executarConsulta<{ maiorOrdem: number }>(
      `SELECT COALESCE(MAX(modelagem_grupo.ordem), 0)::integer AS "maiorOrdem"
         FROM modelagem_grupo
        WHERE modelagem_grupo.is_deleted = false`,
    );
    return linhas[0].maiorOrdem;
  }

  async inserir(dto: ModelagemGrupoInternoCriarDto): Promise<ModelagemGrupoDto> {
    const [criado] = await this.executarConsulta<ModelagemGrupoDto>(
      `INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
       SELECT :titulo, :rotulo, :ordem, :corIndice, NOW(), NOW(), false
       RETURNING id, titulo, rotulo, cor_indice AS "corIndice"`,
      { titulo: dto.titulo, rotulo: dto.rotulo, ordem: dto.ordem, corIndice: dto.corIndice },
    );
    return criado;
  }

  async alterar(dto: ModelagemGrupoInternoAlterarDto): Promise<ModelagemGrupoDto | null> {
    const alterados = await this.executarConsulta<ModelagemGrupoDto>(
      `UPDATE modelagem_grupo
          SET titulo = :titulo,
              rotulo = :rotulo
        WHERE modelagem_grupo.id = :id
          AND modelagem_grupo.is_deleted = false
       RETURNING id, titulo, rotulo, cor_indice AS "corIndice"`,
      { id: dto.id, titulo: dto.titulo, rotulo: dto.rotulo },
    );
    return alterados[0] ?? null;
  }

  async excluir(dto: ModelagemGrupoExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /** `true` se já existe outro grupo ativo com o mesmo rótulo (sem diferenciar maiúsculas). */
  async validarRotulo(dto: ModelagemGrupoValidarRotuloDto): Promise<boolean> {
    const encontrados = await this.executarConsulta<{ id: number }>(
      `SELECT modelagem_grupo.id
         FROM modelagem_grupo
        WHERE LOWER(modelagem_grupo.rotulo) = LOWER(:rotulo)
          AND modelagem_grupo.is_deleted = false
          AND (CAST(:idExcluir AS INTEGER) IS NULL OR modelagem_grupo.id <> CAST(:idExcluir AS INTEGER))`,
      { rotulo: dto.rotulo, idExcluir: dto.idExcluir ?? null },
    );
    return encontrados.length > 0;
  }
}
