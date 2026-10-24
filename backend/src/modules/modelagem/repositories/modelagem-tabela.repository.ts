import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ModelagemTabelaInternoAlterarDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { ColocacaoDeTabela } from '../domain/modelagem';

const COLUNAS_DA_COLOCACAO = `modelagem_tabela.nome_tabela AS "nomeTabela",
       modelagem_tabela.modelagem_grupo_id AS "grupoId",
       modelagem_tabela.posicao_x AS x,
       modelagem_tabela.posicao_y AS y`;

/** Grupo e posição de cada tabela no diagrama (`modelagem_tabela`); o nome da tabela é o do catálogo do PostgreSQL. */
@Injectable()
export class ModelagemTabelaRepository extends BaseRepository<ColocacaoDeTabela> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'modelagem_tabela');
  }

  async listar(): Promise<ColocacaoDeTabela[]> {
    return this.executarConsulta<ColocacaoDeTabela>(
      `SELECT ${COLUNAS_DA_COLOCACAO}
         FROM modelagem_tabela
        WHERE modelagem_tabela.is_deleted = false
        ORDER BY modelagem_tabela.nome_tabela`,
    );
  }

  /** Grava o grupo e a posição da tabela: cria a linha na primeira vez e altera nas seguintes. */
  async gravar(dto: ModelagemTabelaInternoAlterarDto): Promise<ColocacaoDeTabela> {
    const [gravada] = await this.executarConsulta<ColocacaoDeTabela>(
      `INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
       SELECT :nomeTabela, CAST(:grupoId AS INTEGER), :x, :y, NOW(), NOW(), false
       ON CONFLICT (nome_tabela) WHERE is_deleted = false
       DO UPDATE SET modelagem_grupo_id = EXCLUDED.modelagem_grupo_id,
                     posicao_x = EXCLUDED.posicao_x,
                     posicao_y = EXCLUDED.posicao_y
       RETURNING nome_tabela AS "nomeTabela", modelagem_grupo_id AS "grupoId", posicao_x AS x, posicao_y AS y`,
      { nomeTabela: dto.nomeTabela, grupoId: dto.grupoId, x: dto.x, y: dto.y },
    );
    return gravada;
  }
}
