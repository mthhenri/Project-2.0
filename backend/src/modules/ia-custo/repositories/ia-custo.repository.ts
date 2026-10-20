import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { IaModeloPrecoAlteradoDto, IaModeloPrecoAlterarDto, IaModeloPrecoDto, IaUsoRegistrarDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { UsoSomado } from '../domain/calculo-de-custo';

/** O recorte de datas (`yyyy-mm-dd`, extremos inclusos) e se a soma é por dia ou por mês. */
export interface IaUsoSomarDto {
  dataInicio: string;
  dataFim: string;
  porMes: boolean;
}

/** Uso (`ia_uso`) e preço por modelo (`ia_modelo_preco`) da IA. */
@Injectable()
export class IaCustoRepository extends BaseRepository<never> {
  constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'ia_uso');
  }

  async registrarUso(dto: IaUsoRegistrarDto): Promise<void> {
    await this.executarComando(
      `INSERT INTO ia_uso (created_date, updated_date, is_deleted, uso_data, modelo, tokens_entrada, tokens_saida, tokens_cache)
       SELECT NOW(), NOW(), false, NOW(), :modelo, :tokensEntrada, :tokensSaida, :tokensCache`,
      { modelo: dto.modelo, tokensEntrada: dto.tokensEntrada, tokensSaida: dto.tokensSaida, tokensCache: dto.tokensCache },
    );
  }

  /** O uso somado por período e modelo; o dia é o do fuso da sessão (`APP_TIMEZONE`), como no relatório de execuções. */
  async somarUso(dto: IaUsoSomarDto): Promise<UsoSomado[]> {
    return this.executarConsulta<UsoSomado>(
      `SELECT
         TO_CHAR(ia_uso.uso_data, :formato)       AS periodo,
         ia_uso.modelo,
         COUNT(*)::float8                         AS chamadas,
         SUM(ia_uso.tokens_entrada)::float8       AS "tokensEntrada",
         SUM(ia_uso.tokens_saida)::float8         AS "tokensSaida",
         SUM(ia_uso.tokens_cache)::float8         AS "tokensCache"
       FROM ia_uso
       WHERE ia_uso.is_deleted = false
         AND DATE(ia_uso.uso_data) BETWEEN :dataInicio::date AND :dataFim::date
       GROUP BY periodo, ia_uso.modelo`,
      { formato: dto.porMes ? 'YYYY-MM' : 'YYYY-MM-DD', dataInicio: dto.dataInicio, dataFim: dto.dataFim },
    );
  }

  async listarPrecos(): Promise<IaModeloPrecoDto[]> {
    return this.executarConsulta<IaModeloPrecoDto>(
      `SELECT
         ia_modelo_preco.modelo,
         ia_modelo_preco.preco_entrada_milhao::float8 AS "precoEntradaMilhao",
         ia_modelo_preco.preco_saida_milhao::float8   AS "precoSaidaMilhao",
         ia_modelo_preco.preco_cache_milhao::float8   AS "precoCacheMilhao"
       FROM ia_modelo_preco
       WHERE ia_modelo_preco.is_deleted = false
       ORDER BY ia_modelo_preco.modelo ASC`,
    );
  }

  /** Cria o preço do modelo ou troca o que ele já tem (um preço ativo por modelo). */
  async salvarPreco(dto: IaModeloPrecoAlterarDto): Promise<IaModeloPrecoAlteradoDto> {
    const salvos = await this.executarConsulta<IaModeloPrecoAlteradoDto>(
      `INSERT INTO ia_modelo_preco (created_date, updated_date, is_deleted, modelo, preco_entrada_milhao, preco_saida_milhao, preco_cache_milhao)
       SELECT NOW(), NOW(), false, :modelo, :precoEntradaMilhao, :precoSaidaMilhao, :precoCacheMilhao
       ON CONFLICT (modelo) WHERE is_deleted = false
       DO UPDATE SET preco_entrada_milhao = EXCLUDED.preco_entrada_milhao,
                     preco_saida_milhao   = EXCLUDED.preco_saida_milhao,
                     preco_cache_milhao   = EXCLUDED.preco_cache_milhao
       RETURNING
         modelo,
         preco_entrada_milhao::float8 AS "precoEntradaMilhao",
         preco_saida_milhao::float8   AS "precoSaidaMilhao",
         preco_cache_milhao::float8   AS "precoCacheMilhao"`,
      {
        modelo: dto.modelo,
        precoEntradaMilhao: dto.precoEntradaMilhao,
        precoSaidaMilhao: dto.precoSaidaMilhao,
        precoCacheMilhao: dto.precoCacheMilhao,
      },
    );
    return salvos[0];
  }
}
