import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Execucao } from '../domain/models/execucao.model';
import {
  ExecucaoIniciadaDto,
  ExecucaoEncerradaDto,
  ExecucaoAlteradaDto,
  ExecucaoListarDto,
  ExecucaoResumoDto,
  ExecucaoRecuperarDto,
  ExecucaoInternoEncerrarDto,
  ExecucaoAtivaRecuperarDto,
  ExecucaoInternoAlterarDto,
  ExecucaoExcluirDto,
  ExecucaoUsuarioRecuperarDto,
  ExecucaoAtivaDto,
  ExecucaoDiaAgruparDto,
  ExecucaoDiaResumoDto,
  ExecucaoRegistradaDto,
  ExecucaoSobreposicaoValidarDto,
  ExecucaoAcessoFiltrarDto,
  UsuarioTipoEnum,
} from '@project20/shared';

@Injectable()
export class ExecucaoRepository extends BaseRepository<Execucao> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'execucao');
  }

  /**
   * Insere nova execução e retorna os dados criados.
   */
  async inserir(dados: {
    atividadeId: number;
    descricao: string;
    inicioData: Date;
  }): Promise<ExecucaoIniciadaDto> {
    const resultado = await this.executarConsulta<ExecucaoIniciadaDto>(
      `INSERT INTO execucao (atividade_id, descricao, inicio_data, fim_data, created_date, updated_date, is_deleted)
       SELECT :atividadeId, :descricao, :inicioData, NULL, NOW(), NOW(), false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         created_date AS "createdDate"`,
      {
        atividadeId: dados.atividadeId,
        descricao:   dados.descricao,
        inicioData:  dados.inicioData,
      },
    );
    return resultado[0];
  }

  /**
   * Registra uma execução já encerrada (inicio_data e fim_data preenchidos).
   * Diferente de `inserir`, que grava fim_data = NULL (execução em andamento).
   * Retorna a execução registrada com duração calculada em minutos.
   */
  async registrar(dados: {
    atividadeId: number;
    descricao: string;
    inicioData: Date;
    fimData: Date;
  }): Promise<ExecucaoRegistradaDto> {
    const resultado = await this.executarConsulta<ExecucaoRegistradaDto>(
      `INSERT INTO execucao (atividade_id, descricao, inicio_data, fim_data, created_date, updated_date, is_deleted)
       SELECT :atividadeId, :descricao, :inicioData, :fimData, NOW(), NOW(), false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60 AS "duracaoMinutos"`,
      {
        atividadeId: dados.atividadeId,
        descricao:   dados.descricao,
        inicioData:  dados.inicioData,
        fimData:     dados.fimData,
      },
    );
    return resultado[0];
  }

  /**
   * Verifica se existe alguma execução do mesmo usuário cujo intervalo se sobrepõe
   * ao período informado. Execuções em andamento (fim_data IS NULL) são tratadas
   * como se estendendo ao "infinito". Dois intervalos [a,b] e [c,d] se sobrepõem
   * quando a < d AND c < b.
   */
  async validarSobreposicao(dto: ExecucaoSobreposicaoValidarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM execucao
         INNER JOIN atividade
           ON atividade.id = execucao.atividade_id
           AND atividade.is_deleted = false
         WHERE execucao.is_deleted = false
           AND atividade.usuario_id = :usuarioId
           AND execucao.inicio_data < :fimData
           AND :inicioData < COALESCE(execucao.fim_data, 'infinity'::timestamptz)
       ) AS "existe"`,
      { usuarioId: dto.usuarioId, inicioData: dto.inicioData, fimData: dto.fimData },
    );
    return resultado[0].existe;
  }

  /**
   * Encerra uma execução definindo fim_data e atualizando a descrição.
   * Retorna a execução encerrada com duração calculada em minutos.
   */
  async encerrar(dto: ExecucaoInternoEncerrarDto): Promise<ExecucaoEncerradaDto> {
    const resultado = await this.executarConsulta<ExecucaoEncerradaDto>(
      `UPDATE execucao
       SET fim_data     = :fimData,
           descricao    = :descricao,
           updated_date = NOW()
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60 AS "duracaoMinutos"`,
      { id: dto.id, fimData: dto.fimData, descricao: dto.descricao },
    );
    return resultado[0];
  }

  /**
   * Recupera execução por ID com duração calculada.
   * Retorna null se não encontrada ou deletada.
   */
  async recuperar(dto: ExecucaoRecuperarDto): Promise<ExecucaoEncerradaDto | null> {
    const resultado = await this.executarConsulta<ExecucaoEncerradaDto>(
      `SELECT
         execucao.id,
         execucao.atividade_id AS "atividadeId",
         execucao.descricao,
         execucao.inicio_data  AS "inicioData",
         execucao.fim_data     AS "fimData",
         CASE
           WHEN execucao.fim_data IS NOT NULL
           THEN EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60
           ELSE NULL
         END AS "duracaoMinutos"
       FROM execucao
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista execuções com filtros opcionais de atividade, usuário e data.
   * Quando restricao é fornecida, filtra apenas execuções do usuário daquele DTO.
   */
  async listar(
    filtros: ExecucaoListarDto,
    restricao?: ExecucaoAcessoFiltrarDto,
  ): Promise<{ itens: ExecucaoResumoDto[]; total: number; totalMinutosDia: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = {};
    const condicoes: string[] = [
      'execucao.is_deleted = false',
      'atividade.is_deleted = false',
      'usuario.is_deleted = false',
      'demanda.is_deleted = false',
      'projeto.is_deleted = false',
    ];

    const usuarioFiltrado = restricao?.usuarioId ?? filtros.usuarioId;
    if (usuarioFiltrado !== undefined) {
      condicoes.push('atividade.usuario_id = :usuarioId');
      parametros.usuarioId = usuarioFiltrado;
    }

    if (filtros.atividadeId !== undefined) {
      condicoes.push('execucao.atividade_id = :atividadeId');
      parametros.atividadeId = filtros.atividadeId;
    }

    if (filtros.data !== undefined) {
      condicoes.push(`DATE(execucao.inicio_data) = :data`);
      parametros.data = filtros.data;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(execucao.id)::int AS total
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
       INNER JOIN demanda
         ON demanda.id = atividade.demanda_id
       INNER JOIN projeto
         ON projeto.id = demanda.projeto_id
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const [{ totalMinutosDia }] = await this.executarConsulta<{ totalMinutosDia: number }>(
      `SELECT COALESCE(SUM(
         EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data))::int / 60
       ), 0)::int AS "totalMinutosDia"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
       INNER JOIN demanda
         ON demanda.id = atividade.demanda_id
       INNER JOIN projeto
         ON projeto.id = demanda.projeto_id
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<ExecucaoResumoDto>(
      `SELECT
         execucao.id,
         execucao.atividade_id                                                          AS "atividadeId",
         atividade.nome                                                                  AS "nomeAtividade",
         demanda.id                                                                      AS "demandaId",
         demanda.nome                                                                    AS "nomeDemanda",
         projeto.id                                                                      AS "projetoId",
         projeto.nome                                                                    AS "nomeProjeto",
         execucao.descricao,
         execucao.inicio_data                                                            AS "inicioData",
         execucao.fim_data                                                               AS "fimData",
         EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data))::int / 60 AS "duracaoMinutos",
         atividade.usuario_id                                                            AS "usuarioId",
         usuario.nome_completo                                                           AS "nomeUsuario"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
       INNER JOIN demanda
         ON demanda.id = atividade.demanda_id
       INNER JOIN projeto
         ON projeto.id = demanda.projeto_id
       WHERE ${clausulaWhere}
       ORDER BY usuario.nome_completo ASC, execucao.inicio_data DESC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total, totalMinutosDia };
  }

  /**
   * Agrega as execuções de um usuário por dia dentro de um intervalo de datas.
   * Retorna, por dia com execução, o primeiro início, o último fim e o total de
   * minutos trabalhados (somando apenas execuções encerradas).
   */
  async agruparPorDia(dto: ExecucaoDiaAgruparDto): Promise<ExecucaoDiaResumoDto[]> {
    return this.executarConsulta<ExecucaoDiaResumoDto>(
      `SELECT
         DATE(execucao.inicio_data)::text AS "dia",
         MIN(execucao.inicio_data)        AS "primeiroInicioData",
         MAX(execucao.fim_data)           AS "ultimoFimData",
         COALESCE(SUM(
           CASE
             WHEN execucao.fim_data IS NOT NULL
             THEN EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60
             ELSE 0
           END
         ), 0)::int                       AS "totalMinutosTrabalhados"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
         AND atividade.is_deleted = false
       WHERE execucao.is_deleted = false
         AND atividade.usuario_id = :usuarioId
         AND DATE(execucao.inicio_data) BETWEEN :dataInicio::DATE AND :dataFim::DATE
       GROUP BY DATE(execucao.inicio_data)
       ORDER BY DATE(execucao.inicio_data) ASC`,
      { usuarioId: dto.usuarioId, dataInicio: dto.dataInicio, dataFim: dto.dataFim },
    );
  }

  /**
   * Verifica se o usuário possui execução ativa (sem fim_data) em qualquer atividade sua.
   * Retorna os dados básicos da execução ativa, ou null se não houver.
   */
  async recuperarAtiva(dto: ExecucaoAtivaRecuperarDto): Promise<ExecucaoAtivaDto | null> {
    const resultado = await this.executarConsulta<ExecucaoAtivaDto>(
      `SELECT
         execucao.id,
         execucao.atividade_id AS "atividadeId",
         execucao.descricao,
         execucao.inicio_data  AS "inicioData"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
         AND atividade.is_deleted = false
       WHERE execucao.fim_data IS NULL
         AND execucao.is_deleted = false
         AND atividade.usuario_id = :usuarioId
       LIMIT 1`,
      { usuarioId: dto.usuarioId },
    );
    return resultado[0] ?? null;
  }

  /**
   * Altera a descrição, o início e o fim de uma execução.
   * Retorna a execução alterada com duração recalculada.
   */
  async alterar(dto: ExecucaoInternoAlterarDto): Promise<ExecucaoAlteradaDto> {
    const resultado = await this.executarConsulta<ExecucaoAlteradaDto>(
      `UPDATE execucao
       SET descricao    = :descricao,
           inicio_data  = :inicioData,
           fim_data     = :fimData,
           updated_date = NOW()
       WHERE execucao.id = :id
         AND execucao.is_deleted = false
       RETURNING
         id,
         atividade_id AS "atividadeId",
         descricao,
         inicio_data  AS "inicioData",
         fim_data     AS "fimData",
         EXTRACT(EPOCH FROM (COALESCE(fim_data, NOW()) - inicio_data))::int / 60 AS "duracaoMinutos"`,
      { id: dto.id, descricao: dto.descricao, inicioData: dto.inicioData, fimData: dto.fimData },
    );
    return resultado[0];
  }

  /** Soft delete da execução. */
  async excluir(dto: ExecucaoExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Busca o usuarioId associado a uma execução via atividade.usuario_id.
   * Usado para autorização nas operações de encerrar, atualizar e excluir.
   */
  async recuperarUsuario(dto: ExecucaoUsuarioRecuperarDto): Promise<number | null> {
    const resultado = await this.executarConsulta<{ usuarioId: number }>(
      `SELECT atividade.usuario_id AS "usuarioId"
       FROM execucao
       INNER JOIN atividade
         ON atividade.id = execucao.atividade_id
         AND atividade.is_deleted = false
       WHERE execucao.id = :execucaoId
         AND execucao.is_deleted = false
       LIMIT 1`,
      { execucaoId: dto.execucaoId },
    );
    return resultado[0]?.usuarioId ?? null;
  }

  /**
   * Recupera o tipo do dono de uma atividade (via atividade.usuario_id).
   * Usado para decidir se a descrição da execução é obrigatória.
   */
  async recuperarTipoUsuarioDaAtividade(dto: { atividadeId: number }): Promise<UsuarioTipoEnum | null> {
    const resultado = await this.executarConsulta<{ tipo: UsuarioTipoEnum }>(
      `SELECT usuario.tipo
       FROM atividade
       INNER JOIN usuario
         ON usuario.id = atividade.usuario_id
         AND usuario.is_deleted = false
       WHERE atividade.id = :atividadeId
         AND atividade.is_deleted = false
       LIMIT 1`,
      { atividadeId: dto.atividadeId },
    );
    return resultado[0]?.tipo ?? null;
  }
}
