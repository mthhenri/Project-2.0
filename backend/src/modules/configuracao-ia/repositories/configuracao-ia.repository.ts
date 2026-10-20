import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { ConfiguracaoIa } from '../domain/models/configuracao-ia.model';
import {
  ConfiguracaoIaCriarDto,
  ConfiguracaoIaListarDto,
  ConfiguracaoIaResumoDto,
  IaModeloPrecoAlteradoDto,
  IaModeloPrecoAlterarDto,
  IaModeloPrecoDto,
} from '@project20/shared';

const COLUNAS_RESUMO = `
         configuracao_ia.id,
         configuracao_ia.versao,
         tipo_provedor_ia.codigo                     AS provedor,
         configuracao_ia.modelo_rapido               AS "modeloRapido",
         configuracao_ia.modelo_padrao               AS "modeloPadrao",
         configuracao_ia.modelo_analitico            AS "modeloAnalitico",
         configuracao_ia.esforco_analitico           AS "esforcoAnalitico",
         configuracao_ia.checkin_minimo_minutos      AS "checkinMinimoMinutos",
         configuracao_ia.checkin_maximo_minutos      AS "checkinMaximoMinutos",
         configuracao_ia.duracao_recomendada_minutos AS "duracaoRecomendadaMinutos",
         configuracao_ia.checkin_inteligente         AS "checkinInteligente",
         configuracao_ia.rigor_proporcional          AS "rigorProporcional",
         configuracao_ia.deteccao_automatica         AS "deteccaoAutomatica",
         configuracao_ia.duvidas_codigo              AS "duvidasCodigo",
         configuracao_ia.modo_contexto_chat          AS "modoContextoChat",
         configuracao_ia.ia_desligada                AS "iaDesligada",
         configuracao_ia.usuario_id                  AS "usuarioId",
         usuario.nome_completo                       AS "usuarioNome",
         configuracao_ia.created_date                AS "createdDate"`;

const JUNCOES_RESUMO = `
       FROM configuracao_ia
       INNER JOIN tipo_provedor_ia
          ON tipo_provedor_ia.id = configuracao_ia.tipo_provedor_ia_id
         AND tipo_provedor_ia.is_deleted = false
       INNER JOIN usuario
          ON usuario.id = configuracao_ia.usuario_id`;

@Injectable()
export class ConfiguracaoIaRepository extends BaseRepository<ConfiguracaoIa> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'configuracao_ia');
  }

  /** A versão ativa: a de maior `versao`. */
  async recuperarAtiva(): Promise<ConfiguracaoIaResumoDto | undefined> {
    const encontradas = await this.executarConsulta<ConfiguracaoIaResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE configuracao_ia.is_deleted = false
       ORDER BY configuracao_ia.versao DESC
       LIMIT 1`,
    );
    return encontradas[0];
  }

  async listar(dto: ConfiguracaoIaListarDto): Promise<{ itens: ConfiguracaoIaResumoDto[]; total: number }> {
    const pagina = dto.pagina ?? 1;
    const itensPorPagina = dto.itensPorPagina ?? 20;

    const totais = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total FROM configuracao_ia WHERE configuracao_ia.is_deleted = false`,
    );
    const itens = await this.executarConsulta<ConfiguracaoIaResumoDto>(
      `SELECT ${COLUNAS_RESUMO}
       ${JUNCOES_RESUMO}
       WHERE configuracao_ia.is_deleted = false
       ORDER BY configuracao_ia.versao DESC
       LIMIT :limite OFFSET :deslocamento`,
      { limite: itensPorPagina, deslocamento: (pagina - 1) * itensPorPagina },
    );
    return { itens, total: parseInt(totais[0].total, 10) };
  }

  /** Os preços por modelo (dólar por milhão de tokens) da versão ativa, em ordem de modelo. Vivem no JSONB `precos_modelo` (task 202). */
  async listarPrecos(): Promise<IaModeloPrecoDto[]> {
    return this.executarConsulta<IaModeloPrecoDto>(
      `SELECT
         preco.key                                                AS modelo,
         CAST(preco.value ->> 'precoEntradaMilhao' AS float8)     AS "precoEntradaMilhao",
         CAST(preco.value ->> 'precoSaidaMilhao' AS float8)       AS "precoSaidaMilhao",
         CAST(preco.value ->> 'precoCacheMilhao' AS float8)       AS "precoCacheMilhao"
       FROM jsonb_each((
         SELECT configuracao_ia.precos_modelo
         FROM configuracao_ia
         WHERE configuracao_ia.is_deleted = false
         ORDER BY configuracao_ia.versao DESC
         LIMIT 1
       )) AS preco
       ORDER BY preco.key ASC`,
    );
  }

  /**
   * Define (ou troca) o preço de um modelo **na versão ativa, no lugar**, sem criar versão: o custo usa sempre o preço de hoje, então
   * versionar o preço não mudaria nenhum número. Mesmo lock consultivo de `inserirNovaVersao`, para o preço não se perder numa versão
   * nova gravada ao mesmo tempo (que copia os preços da anterior).
   */
  async alterarPrecoDaVersaoAtiva(dto: IaModeloPrecoAlterarDto): Promise<IaModeloPrecoAlteradoDto> {
    await this.conexaoBancoDados.transaction(async (transacao) => {
      await this.executarComando(`SELECT pg_advisory_xact_lock(hashtext('configuracao_ia'))`, {}, transacao);
      const alteradas = await this.executarConsulta<{ id: number }>(
        `UPDATE configuracao_ia
         SET precos_modelo = jsonb_set(configuracao_ia.precos_modelo, ARRAY[CAST(:modelo AS text)], CAST(:preco AS jsonb), true)
         WHERE configuracao_ia.id = (
           SELECT ativa.id FROM configuracao_ia AS ativa WHERE ativa.is_deleted = false ORDER BY ativa.versao DESC LIMIT 1
         )
         RETURNING configuracao_ia.id`,
        {
          modelo: dto.modelo,
          preco: JSON.stringify({
            precoEntradaMilhao: dto.precoEntradaMilhao,
            precoSaidaMilhao: dto.precoSaidaMilhao,
            precoCacheMilhao: dto.precoCacheMilhao,
          }),
        },
        transacao,
      );
      if (alteradas.length === 0) throw new Error('Nenhuma configuração da IA ativa');
    });
    return { modelo: dto.modelo, precoEntradaMilhao: dto.precoEntradaMilhao, precoSaidaMilhao: dto.precoSaidaMilhao, precoCacheMilhao: dto.precoCacheMilhao };
  }

  /**
   * Grava a versão seguinte (`maior + 1`) numa transação que serializa as gravações (lock consultivo): duas gravações
   * simultâneas nunca geram a mesma versão. O índice único parcial é a rede de segurança.
   */
  async inserirNovaVersao(dto: ConfiguracaoIaCriarDto, usuarioId: number): Promise<ConfiguracaoIaResumoDto> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      await this.executarComando(`SELECT pg_advisory_xact_lock(hashtext('configuracao_ia'))`, {}, transacao);

      const inseridas = await this.executarConsulta<{ id: number }>(
        `INSERT INTO configuracao_ia (
           versao, tipo_provedor_ia_id, modelo_rapido, modelo_padrao, modelo_analitico, esforco_analitico,
           checkin_minimo_minutos, checkin_maximo_minutos, duracao_recomendada_minutos,
           checkin_inteligente, rigor_proporcional, deteccao_automatica, duvidas_codigo, modo_contexto_chat, ia_desligada,
           precos_modelo, usuario_id, created_date, updated_date, is_deleted
         )
         SELECT
           COALESCE((SELECT MAX(configuracao_ia.versao) FROM configuracao_ia WHERE configuracao_ia.is_deleted = false), 0) + 1,
           tipo_provedor_ia.id, :modeloRapido, :modeloPadrao, :modeloAnalitico, :esforcoAnalitico,
           :checkinMinimoMinutos, :checkinMaximoMinutos, :duracaoRecomendadaMinutos,
           :checkinInteligente, :rigorProporcional, :deteccaoAutomatica, :duvidasCodigo, :modoContextoChat, :iaDesligada,
           COALESCE(
             (SELECT anterior.precos_modelo FROM configuracao_ia AS anterior WHERE anterior.is_deleted = false ORDER BY anterior.versao DESC LIMIT 1),
             CAST('{}' AS jsonb)),
           :usuarioId, NOW(), NOW(), false
         FROM tipo_provedor_ia
         WHERE tipo_provedor_ia.codigo = :provedor
           AND tipo_provedor_ia.is_deleted = false
         RETURNING id`,
        { ...dto, usuarioId },
        transacao,
      );
      if (inseridas.length === 0) throw new Error('Provedor de IA inexistente');

      const criadas = await this.executarConsulta<ConfiguracaoIaResumoDto>(
        `SELECT ${COLUNAS_RESUMO}
         ${JUNCOES_RESUMO}
         WHERE configuracao_ia.id = :id`,
        { id: inseridas[0].id },
        transacao,
      );
      return criadas[0];
    });
  }
}
