import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Demanda } from '../domain/models/demanda.model';
import {
  DemandaCriadaDto,
  DemandaRecuperadaDto,
  DemandaResumoDto,
  DemandaListarDto,
  DemandaGrafoDto,
  DemandaGrafoNoDto,
  DemandaAncestralDto,
  DemandaStatusEnum,
  DemandaPrioridadeEnum,
} from '@project20/shared';
import { UsuarioTipoEnum, UsuarioStatusEnum } from '@project20/shared';

type DemandaCriarDados = Omit<Demanda, 'id' | 'isDeleted' | 'createdDate' | 'updatedDate' | 'deletedDate'>;

@Injectable()
export class DemandaRepository extends BaseRepository<Demanda> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'demanda');
  }

  /**
   * Insere nova demanda e retorna os dados criados.
   * Aceita transação Knex para operações atômicas.
   */
  async inserir(dados: DemandaCriarDados, transacao?: Knex.Transaction): Promise<DemandaCriadaDto> {
    const resultado = await this.executarConsulta<DemandaCriadaDto>(
      `INSERT INTO demanda (
         projeto_id, demanda_pai_id, nome, descricao_tecnica, descricao_cliente,
         documentacao, horas_estimadas, prioridade, status, is_estrutural,
         previsao_fim_data, ordem_exibicao, created_date, updated_date, is_deleted
       )
       SELECT
         :projetoId, :demandaPaiId, :nome, :descricaoTecnica, :descricaoCliente,
         :documentacao, :horasEstimadas, :prioridade, :status, :isEstrutural,
         :previsaoFimData, :ordemExibicao, NOW(), NOW(), false
       RETURNING
         id,
         projeto_id         AS "projetoId",
         demanda_pai_id     AS "demandaPaiId",
         nome,
         horas_estimadas    AS "horasEstimadas",
         prioridade,
         status,
         is_estrutural      AS "isEstrutural",
         previsao_fim_data  AS "previsaoFimData",
         ordem_exibicao     AS "ordemExibicao",
         created_date       AS "createdDate"`,
      {
        projetoId:        dados.projetoId,
        demandaPaiId:     dados.demandaPaiId ?? null,
        nome:             dados.nome,
        descricaoTecnica: dados.descricaoTecnica ?? null,
        descricaoCliente: dados.descricaoCliente ?? null,
        documentacao:     dados.documentacao ?? null,
        horasEstimadas:   dados.horasEstimadas,
        prioridade:       dados.prioridade,
        status:           dados.status,
        isEstrutural:     dados.isEstrutural,
        previsaoFimData:  dados.previsaoFimData ?? null,
        ordemExibicao:    dados.ordemExibicao,
      },
      transacao,
    );
    return resultado[0];
  }

  /**
   * Insere linha em demanda_usuario vinculando usuário a demanda.
   * Aceita transação Knex para operações atômicas.
   */
  async inserirDemandaUsuario(
    demandaId: number,
    usuarioId: number,
    transacao?: Knex.Transaction,
  ): Promise<void> {
    await this.executarComando(
      `INSERT INTO demanda_usuario (demanda_id, usuario_id, created_date, updated_date, is_deleted)
       SELECT :demandaId, :usuarioId, NOW(), NOW(), false`,
      { demandaId, usuarioId },
      transacao,
    );
  }

  /**
   * Insere a demanda e suas atribuições iniciais em uma única transação atômica.
   * O criador e todos os gestores ativos são atribuídos automaticamente.
   * Gestores que são o próprio criador não são duplicados.
   */
  async inserirComAtribuicao(
    dados: DemandaCriarDados,
    criadorId: number,
    gestorIds: number[],
  ): Promise<DemandaCriadaDto> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      const demandaCriada = await this.inserir(dados, transacao);
      await this.inserirDemandaUsuario(demandaCriada.id, criadorId, transacao);
      for (const gestorId of gestorIds) {
        if (gestorId !== criadorId) {
          await this.inserirDemandaUsuario(demandaCriada.id, gestorId, transacao);
        }
      }
      return demandaCriada;
    });
  }

  /**
   * Recupera demanda por ID.
   * Se usuarioId for fornecido, verifica se o usuário está atribuído à demanda.
   * Retorna null se não encontrada, deletada ou sem acesso.
   */
  async buscarIdentificador(id: number, usuarioId?: number): Promise<DemandaRecuperadaDto | null> {
    const condicoes: string[] = ['demanda.id = :id', 'demanda.is_deleted = false'];
    const parametros: Record<string, unknown> = { id };

    let joinDemandaUsuario = '';
    if (usuarioId !== undefined) {
      joinDemandaUsuario = `
        INNER JOIN demanda_usuario
          ON demanda_usuario.demanda_id = demanda.id
          AND demanda_usuario.usuario_id = :usuarioId
          AND demanda_usuario.is_deleted = false`;
      parametros.usuarioId = usuarioId;
    }

    const resultado = await this.executarConsulta<DemandaRecuperadaDto>(
      `SELECT
         demanda.id,
         demanda.projeto_id         AS "projetoId",
         demanda.demanda_pai_id     AS "demandaPaiId",
         demanda.nome,
         demanda.descricao_tecnica  AS "descricaoTecnica",
         demanda.descricao_cliente  AS "descricaoCliente",
         demanda.documentacao,
         demanda.horas_estimadas    AS "horasEstimadas",
         demanda.prioridade,
         demanda.status,
         demanda.is_estrutural      AS "isEstrutural",
         demanda.previsao_fim_data  AS "previsaoFimData",
         demanda.ordem_exibicao     AS "ordemExibicao",
         demanda.created_date       AS "createdDate"
       FROM demanda
       ${joinDemandaUsuario}
       WHERE ${condicoes.join(' AND ')}
       LIMIT 1`,
      parametros,
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista demandas de um projeto com paginação e filtros.
   * Se usuarioId for fornecido, restringe às demandas às quais o usuário está atribuído.
   */
  async listar(
    filtros: DemandaListarDto,
    usuarioId?: number,
  ): Promise<{ itens: DemandaResumoDto[]; total: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = { projetoId: filtros.projetoId };
    const condicoes: string[] = [
      'demanda.is_deleted = false',
      'demanda.projeto_id = :projetoId',
    ];

    let joinDemandaUsuario = '';
    if (usuarioId !== undefined) {
      joinDemandaUsuario = `
        INNER JOIN demanda_usuario
          ON demanda_usuario.demanda_id = demanda.id
          AND demanda_usuario.usuario_id = :usuarioId
          AND demanda_usuario.is_deleted = false`;
      parametros.usuarioId = usuarioId;
    }

    if (filtros.status !== undefined) {
      condicoes.push('demanda.status = :status');
      parametros.status = filtros.status;
    }

    if (filtros.prioridade !== undefined) {
      condicoes.push('demanda.prioridade = :prioridade');
      parametros.prioridade = filtros.prioridade;
    }

    if (filtros.isEstrutural !== undefined) {
      condicoes.push('demanda.is_estrutural = :isEstrutural');
      parametros.isEstrutural = filtros.isEstrutural;
    }

    if (filtros.demandaPaiId !== undefined) {
      condicoes.push('demanda.demanda_pai_id = :demandaPaiId');
      parametros.demandaPaiId = filtros.demandaPaiId;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(DISTINCT demanda.id)::int AS total
       FROM demanda
       ${joinDemandaUsuario}
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<DemandaResumoDto>(
      `SELECT DISTINCT
         demanda.id,
         demanda.nome,
         demanda.prioridade,
         demanda.status,
         demanda.is_estrutural   AS "isEstrutural",
         demanda.horas_estimadas AS "horasEstimadas",
         demanda.ordem_exibicao  AS "ordemExibicao"
       FROM demanda
       ${joinDemandaUsuario}
       WHERE ${clausulaWhere}
       ORDER BY demanda.ordem_exibicao ASC, demanda.nome ASC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Atualiza campos da demanda e retorna o estado atualizado.
   */
  async atualizar(id: number, dados: Partial<Demanda>): Promise<DemandaRecuperadaDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id };

    if (dados.demandaPaiId !== undefined) {
      setClauses.push('demanda_pai_id = :demandaPaiId');
      parametros.demandaPaiId = dados.demandaPaiId;
    }
    if (dados.nome !== undefined) {
      setClauses.push('nome = :nome');
      parametros.nome = dados.nome;
    }
    if (dados.descricaoTecnica !== undefined) {
      setClauses.push('descricao_tecnica = :descricaoTecnica');
      parametros.descricaoTecnica = dados.descricaoTecnica;
    }
    if (dados.descricaoCliente !== undefined) {
      setClauses.push('descricao_cliente = :descricaoCliente');
      parametros.descricaoCliente = dados.descricaoCliente;
    }
    if (dados.documentacao !== undefined) {
      setClauses.push('documentacao = :documentacao');
      parametros.documentacao = dados.documentacao;
    }
    if (dados.horasEstimadas !== undefined) {
      setClauses.push('horas_estimadas = :horasEstimadas');
      parametros.horasEstimadas = dados.horasEstimadas;
    }
    if (dados.prioridade !== undefined) {
      setClauses.push('prioridade = :prioridade');
      parametros.prioridade = dados.prioridade;
    }
    if (dados.status !== undefined) {
      setClauses.push('status = :status');
      parametros.status = dados.status;
    }
    if (dados.isEstrutural !== undefined) {
      setClauses.push('is_estrutural = :isEstrutural');
      parametros.isEstrutural = dados.isEstrutural;
    }
    if (dados.previsaoFimData !== undefined) {
      setClauses.push('previsao_fim_data = :previsaoFimData');
      parametros.previsaoFimData = dados.previsaoFimData;
    }
    if (dados.ordemExibicao !== undefined) {
      setClauses.push('ordem_exibicao = :ordemExibicao');
      parametros.ordemExibicao = dados.ordemExibicao;
    }

    const resultado = await this.executarConsulta<DemandaRecuperadaDto>(
      `UPDATE demanda
       SET ${setClauses.join(', ')}
       WHERE demanda.id = :id
         AND demanda.is_deleted = false
       RETURNING
         id,
         projeto_id         AS "projetoId",
         demanda_pai_id     AS "demandaPaiId",
         nome,
         descricao_tecnica  AS "descricaoTecnica",
         descricao_cliente  AS "descricaoCliente",
         documentacao,
         horas_estimadas    AS "horasEstimadas",
         prioridade,
         status,
         is_estrutural      AS "isEstrutural",
         previsao_fim_data  AS "previsaoFimData",
         ordem_exibicao     AS "ordemExibicao",
         created_date       AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /**
   * Retorna todos os descendentes de uma demanda em formato plano com nível.
   * Inclui a própria demanda (nível 0). Usa CTE recursivo conforme SCHEMA.md.
   */
  async buscarDescendentes(demandaId: number): Promise<{
    id: number;
    demandaPaiId: number | null;
    nome: string;
    status: DemandaStatusEnum;
    prioridade: DemandaPrioridadeEnum;
    isEstrutural: boolean;
    horasEstimadas: number;
    nivel: number;
  }[]> {
    return this.executarConsulta<{
      id: number;
      demandaPaiId: number | null;
      nome: string;
      status: DemandaStatusEnum;
      prioridade: DemandaPrioridadeEnum;
      isEstrutural: boolean;
      horasEstimadas: number;
      nivel: number;
    }>(
      `WITH RECURSIVE arvore_demanda AS (
         SELECT id, demanda_pai_id, nome, status, prioridade, is_estrutural,
                horas_estimadas, 0 AS nivel
         FROM demanda
         WHERE id = :demandaId
           AND is_deleted = false

         UNION ALL

         SELECT demanda_filho.id, demanda_filho.demanda_pai_id, demanda_filho.nome,
                demanda_filho.status, demanda_filho.prioridade, demanda_filho.is_estrutural,
                demanda_filho.horas_estimadas, arvore_demanda.nivel + 1
         FROM demanda AS demanda_filho
         INNER JOIN arvore_demanda
           ON demanda_filho.demanda_pai_id = arvore_demanda.id
         WHERE demanda_filho.is_deleted = false
       )
       SELECT
         id,
         demanda_pai_id  AS "demandaPaiId",
         nome,
         status,
         prioridade,
         is_estrutural   AS "isEstrutural",
         horas_estimadas AS "horasEstimadas",
         nivel
       FROM arvore_demanda
       ORDER BY nivel, nome`,
      { demandaId },
    );
  }

  /**
   * Retorna todos os ancestrais de uma demanda (do pai até a raiz).
   * Usa CTE recursivo invertido. Nível 1 = pai direto.
   */
  async buscarAncestral(demandaId: number): Promise<DemandaAncestralDto[]> {
    return this.executarConsulta<DemandaAncestralDto>(
      `WITH RECURSIVE ancestrais AS (
         SELECT id, demanda_pai_id, nome, 0 AS nivel
         FROM demanda
         WHERE id = :demandaId
           AND is_deleted = false

         UNION ALL

         SELECT demanda_pai.id, demanda_pai.demanda_pai_id, demanda_pai.nome,
                ancestrais.nivel + 1
         FROM demanda AS demanda_pai
         INNER JOIN ancestrais
           ON demanda_pai.id = ancestrais.demanda_pai_id
         WHERE demanda_pai.is_deleted = false
       )
       SELECT id, nome, nivel
       FROM ancestrais
       WHERE nivel > 0
       ORDER BY nivel DESC`,
      { demandaId },
    );
  }

  /** Soft delete da demanda. */
  async excluir(id: number): Promise<void> {
    await this.executarSoftDelete(id);
  }

  /**
   * Retorna os IDs de todos os gestores ativos no sistema.
   * Usado na auto-atribuição ao criar demanda.
   */
  async buscarIdGestoresAtivos(): Promise<number[]> {
    const resultado = await this.executarConsulta<{ id: number }>(
      `SELECT usuario.id
       FROM usuario
       WHERE usuario.tipo   = :tipo
         AND usuario.status = :status
         AND usuario.is_deleted = false`,
      { tipo: UsuarioTipoEnum.GESTOR, status: UsuarioStatusEnum.ATIVO },
    );
    return resultado.map((registro) => registro.id);
  }

  /**
   * Verifica se o usuário tem acesso ao projeto via demanda_usuario.
   * Acesso derivado: desenvolvedor vê projeto se tiver ao menos uma demanda atribuída.
   */
  async usuarioTemAcessoProjeto(projetoId: number, usuarioId: number): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM demanda
         INNER JOIN demanda_usuario
           ON demanda_usuario.demanda_id = demanda.id
           AND demanda_usuario.is_deleted = false
         WHERE demanda.projeto_id = :projetoId
           AND demanda.is_deleted = false
           AND demanda_usuario.usuario_id = :usuarioId
       ) AS existe`,
      { projetoId, usuarioId },
    );
    return resultado[0].existe;
  }

  /**
   * Retorna todos os nós do grafo de demandas de um projeto.
   * Arestas de conexão serão adicionadas na task 12 (DemandaConexao).
   */
  async recuperarGrafo(projetoId: number): Promise<DemandaGrafoDto> {
    const nos = await this.executarConsulta<DemandaGrafoNoDto>(
      `SELECT
         demanda.id,
         demanda.nome,
         demanda.status,
         demanda.prioridade,
         demanda.is_estrutural AS "isEstrutural"
       FROM demanda
       WHERE demanda.projeto_id = :projetoId
         AND demanda.is_deleted = false
       ORDER BY demanda.ordem_exibicao ASC`,
      { projetoId },
    );

    return { nos, arestas: [] };
  }
}
