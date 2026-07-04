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
  DemandaGrafoArestaDto,
  DemandaAncestralDto,
  TipoDemandaStatusEnum,
  DemandaConexaoCriadaDto,
  DemandaConexaoResumoDto,
  DemandaMembroDto,
  DemandaUsuarioAtribuidoDto,
  DemandaValidarConexaoDto,
  TagResumoDto,
  DemandaRecuperarDto,
  DemandaAcessoFiltrarDto,
  DemandaMembroInternoAtribuirDto,
  DemandaConexaoVerificarDto,
  DemandaTagsListarDto,
  DemandaTagsInternoAtribuirDto,
  DemandaTagInternoRemoverDto,
  DemandaMembroListarDto,
  DemandaMembroInternoRemoverDto,
  DemandaMembroVerificarDto,
  DemandaConexaoExcluirDto,
  DemandaAtribuicaoInserirDto,
  DemandaExcluirDto,
  DemandaAcessoProjetoVerificarDto,
  DemandaDescendenteListarDto,
  DemandaAncestralListarDto,
  DemandaGrafoRecuperarDto,
  DemandaConexaoListarDto,
  DemandaAtribuidaDto,
  DemandaAtribuidasListarDto,
  DemandaInternoAlterarDto,
  DemandaPlanejamentoDto,
  DemandaPlanejamentoListarDto,
} from '@project20/shared';

type DemandaCriarDados = Omit<Demanda, 'id' | 'isDeleted' | 'createdDate' | 'updatedDate' | 'deletedDate'>;

/** Separador exibido entre os níveis do caminho da demanda (raiz → folha). */
const SEPARADOR_CAMINHO = ' › ';

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
         documentacao, horas_estimadas, tipo_demanda_status_id, is_estrutural,
         previsao_fim_data, created_date, updated_date, is_deleted
       )
       SELECT
         :projetoId, :demandaPaiId, :nome, :descricaoTecnica, :descricaoCliente,
         :documentacao, :horasEstimadas,
         (SELECT tipo_demanda_status.id FROM tipo_demanda_status
            WHERE tipo_demanda_status.codigo = :status AND tipo_demanda_status.is_deleted = false),
         :isEstrutural,
         :previsaoFimData, NOW(), NOW(), false
       RETURNING
         id,
         projeto_id         AS "projetoId",
         demanda_pai_id     AS "demandaPaiId",
         nome,
         horas_estimadas    AS "horasEstimadas",
         (SELECT tipo_demanda_status.codigo FROM tipo_demanda_status
            WHERE tipo_demanda_status.id = demanda.tipo_demanda_status_id) AS status,
         is_estrutural      AS "isEstrutural",
         previsao_fim_data  AS "previsaoFimData",
         created_date       AS "createdDate"`,
      {
        projetoId:        dados.projetoId,
        demandaPaiId:     dados.demandaPaiId ?? null,
        nome:             dados.nome,
        descricaoTecnica: dados.descricaoTecnica ?? null,
        descricaoCliente: dados.descricaoCliente ?? null,
        documentacao:     dados.documentacao ?? null,
        horasEstimadas:   dados.horasEstimadas,
        status:           dados.status,
        isEstrutural:     dados.isEstrutural,
        previsaoFimData:  dados.previsaoFimData ?? null,
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
    dto: DemandaMembroInternoAtribuirDto,
    transacao?: Knex.Transaction,
  ): Promise<void> {
    await this.executarComando(
      `INSERT INTO demanda_usuario (demanda_id, usuario_id, created_date, updated_date, is_deleted)
       SELECT :demandaId, :usuarioId, NOW(), NOW(), false`,
      { demandaId: dto.demandaId, usuarioId: dto.usuarioId },
      transacao,
    );
  }

  /**
   * Insere a demanda e suas atribuições iniciais em uma única transação atômica.
   * Apenas os usuários informados em `usuarioIds` recebem linha em demanda_usuario
   * (criador desenvolvedor e membros selecionados na criação). O gestor não é atribuído
   * por ser gestor — `usuarioIds` pode ser `[]` (criação por gestor sem membros).
   */
  async inserirComAtribuicao(
    dados: DemandaCriarDados,
    dto: DemandaAtribuicaoInserirDto,
  ): Promise<DemandaCriadaDto> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      const demandaCriada = await this.inserir(dados, transacao);

      for (const usuarioId of dto.usuarioIds) {
        await this.inserirDemandaUsuario({ demandaId: demandaCriada.id, usuarioId }, transacao);
      }

      return demandaCriada;
    });
  }

  /**
   * Recupera demanda por ID.
   * Se filtro for fornecido, restringe à visualização: o usuário precisa ter
   * acesso ao projeto da demanda (ser membro de ao menos uma demanda do projeto
   * via demanda_usuario). A permissão de edição é verificada à parte na service.
   * Retorna null se não encontrada, deletada ou sem acesso ao projeto.
   */
  async recuperar(dto: DemandaRecuperarDto, filtro?: DemandaAcessoFiltrarDto): Promise<DemandaRecuperadaDto | null> {
    const condicoes: string[] = ['demanda.id = :id', 'demanda.is_deleted = false'];
    const parametros: Record<string, unknown> = { id: dto.id };

    if (filtro !== undefined) {
      condicoes.push(`EXISTS (
        SELECT 1
        FROM demanda demanda_do_projeto
        INNER JOIN demanda_usuario
          ON demanda_usuario.demanda_id = demanda_do_projeto.id
          AND demanda_usuario.usuario_id = :usuarioId
          AND demanda_usuario.is_deleted = false
        WHERE demanda_do_projeto.projeto_id = demanda.projeto_id
          AND demanda_do_projeto.is_deleted = false
      )`);
      parametros.usuarioId = filtro.usuarioId;
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
         tipo_demanda_status.codigo AS status,
         demanda.is_estrutural      AS "isEstrutural",
         demanda.previsao_fim_data  AS "previsaoFimData",
         demanda.created_date       AS "createdDate"
       FROM demanda
       INNER JOIN tipo_demanda_status
         ON tipo_demanda_status.id = demanda.tipo_demanda_status_id
         AND tipo_demanda_status.is_deleted = false
       WHERE ${condicoes.join(' AND ')}
       LIMIT 1`,
      parametros,
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista demandas de um projeto com paginação e filtros.
   * Se restricao for fornecida, restringe às demandas às quais o usuário está atribuído.
   */
  async listar(
    filtros: DemandaListarDto,
    restricao?: DemandaAcessoFiltrarDto,
  ): Promise<{ itens: DemandaResumoDto[]; total: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = { projetoId: filtros.projetoId };
    const condicoes: string[] = [
      'demanda.is_deleted = false',
      'demanda.projeto_id = :projetoId',
    ];

    let joinDemandaUsuario = '';
    if (restricao !== undefined) {
      joinDemandaUsuario = `
        INNER JOIN demanda_usuario
          ON demanda_usuario.demanda_id = demanda.id
          AND demanda_usuario.usuario_id = :usuarioId
          AND demanda_usuario.is_deleted = false`;
      parametros.usuarioId = restricao.usuarioId;
    }

    const joinStatus = `
        INNER JOIN tipo_demanda_status
          ON tipo_demanda_status.id = demanda.tipo_demanda_status_id
          AND tipo_demanda_status.is_deleted = false`;

    if (filtros.status !== undefined) {
      condicoes.push('tipo_demanda_status.codigo = :status');
      parametros.status = filtros.status;
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
       ${joinStatus}
       ${joinDemandaUsuario}
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const clausulaPaginacao = filtros.allRows
      ? ''
      : `LIMIT ${itensPorPagina} OFFSET ${(pagina - 1) * itensPorPagina}`;
    parametros.separadorCaminho = SEPARADOR_CAMINHO;
    const itens = await this.executarConsulta<DemandaResumoDto>(
      `WITH RECURSIVE caminho_demanda AS (
         SELECT demanda.id, demanda.nome::text AS caminho
         FROM demanda
         WHERE demanda.projeto_id = :projetoId
           AND demanda.demanda_pai_id IS NULL
           AND demanda.is_deleted = false
         UNION ALL
         SELECT demanda_filho.id,
                (caminho_demanda.caminho || :separadorCaminho || demanda_filho.nome)::text
         FROM demanda AS demanda_filho
         INNER JOIN caminho_demanda ON demanda_filho.demanda_pai_id = caminho_demanda.id
         WHERE demanda_filho.projeto_id = :projetoId
           AND demanda_filho.is_deleted = false
       )
       SELECT DISTINCT
         demanda.id,
         demanda.nome,
         COALESCE(caminho_demanda.caminho, demanda.nome) AS "caminho",
         tipo_demanda_status.codigo AS status,
         demanda.is_estrutural   AS "isEstrutural",
         demanda.horas_estimadas AS "horasEstimadas"
       FROM demanda
       ${joinStatus}
       ${joinDemandaUsuario}
       LEFT JOIN caminho_demanda ON caminho_demanda.id = demanda.id
       WHERE ${clausulaWhere}
       ORDER BY demanda.nome ASC
       ${clausulaPaginacao}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Lista as demandas planejadas/pendentes (exclui CONCLUIDA) já com o nome do projeto
   * para exibição "Projeto - Demanda".
   * Quando `apenasAtribuidas` é true (desenvolvedor), restringe às demandas às quais o
   * usuário está atribuído via demanda_usuario; quando false (gestor), retorna todas.
   */
  async listarAtribuidas(dto: DemandaAtribuidasListarDto): Promise<DemandaAtribuidaDto[]> {
    const joinAtribuicao = dto.apenasAtribuidas
      ? `INNER JOIN demanda_usuario
           ON demanda_usuario.demanda_id = demanda.id
           AND demanda_usuario.usuario_id = :usuarioId
           AND demanda_usuario.is_deleted = false`
      : '';

    return this.executarConsulta<DemandaAtribuidaDto>(
      `SELECT demanda.id,
              demanda.nome,
              projeto.id   AS "projetoId",
              projeto.nome AS "nomeProjeto"
       FROM demanda
       ${joinAtribuicao}
       INNER JOIN tipo_demanda_status
         ON tipo_demanda_status.id = demanda.tipo_demanda_status_id
         AND tipo_demanda_status.is_deleted = false
       INNER JOIN projeto
         ON projeto.id = demanda.projeto_id
         AND projeto.is_deleted = false
       WHERE demanda.is_deleted = false
         AND tipo_demanda_status.codigo IN ('PLANEJADA', 'PENDENTE')
       ORDER BY projeto.nome ASC, demanda.nome ASC`,
      { usuarioId: dto.usuarioId },
    );
  }

  /**
   * Lista as demandas não-concluídas de um projeto (estruturais e folhas) para a visão de
   * Planejamento do gestor. Estruturais também podem ter atividades/execuções próprias e
   * horas estimadas, então também entram como linha. Cada linha traz o caminho hierárquico
   * (raiz → demanda, via CTE recursiva), as horas estimadas, os minutos executados e os
   * executores ativos (quem está com execução aberta agora).
   *
   * `minutosExecutados` soma as execuções das atividades diretas da demanda, tratando a
   * execução em andamento (`fim_data IS NULL`) como se encerrasse agora — `COALESCE(fim_data, NOW())`.
   * Como `execucao.inicio_data`/`fim_data` são `timestamptz`, a comparação com `NOW()` é correta.
   */
  async listarPlanejamento(dto: DemandaPlanejamentoListarDto): Promise<DemandaPlanejamentoDto[]> {
    return this.executarConsulta<DemandaPlanejamentoDto>(
      `WITH RECURSIVE caminho_demanda AS (
         SELECT demanda.id,
                demanda.nome::text          AS caminho,
                demanda.is_estrutural,
                demanda.tipo_demanda_status_id,
                demanda.horas_estimadas
         FROM demanda
         WHERE demanda.projeto_id = :projetoId
           AND demanda.demanda_pai_id IS NULL
           AND demanda.is_deleted = false
         UNION ALL
         SELECT demanda_filho.id,
                (caminho_demanda.caminho || :separadorCaminho || demanda_filho.nome)::text,
                demanda_filho.is_estrutural,
                demanda_filho.tipo_demanda_status_id,
                demanda_filho.horas_estimadas
         FROM demanda AS demanda_filho
         INNER JOIN caminho_demanda ON demanda_filho.demanda_pai_id = caminho_demanda.id
         WHERE demanda_filho.projeto_id = :projetoId
           AND demanda_filho.is_deleted = false
       )
       SELECT
         caminho_demanda.id              AS "demandaId",
         caminho_demanda.caminho         AS "caminho",
         caminho_demanda.is_estrutural   AS "isEstrutural",
         tipo_demanda_status.codigo      AS status,
         caminho_demanda.horas_estimadas AS "horasEstimadas",
         COALESCE((
           SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data)) / 60)
           FROM atividade
           INNER JOIN execucao
             ON execucao.atividade_id = atividade.id
             AND execucao.is_deleted = false
           WHERE atividade.demanda_id = caminho_demanda.id
             AND atividade.is_deleted = false
         ), 0)::int AS "minutosExecutados",
         NULLIF(demanda.descricao_tecnica, '') IS NOT NULL AS "temDescricaoTecnica",
         NULLIF(demanda.descricao_cliente,  '') IS NOT NULL AS "temDescricaoCliente",
         NULLIF(demanda.documentacao,        '') IS NOT NULL AS "temDocumentacao",
         COALESCE((
           SELECT JSON_AGG(JSON_BUILD_OBJECT(
             'usuarioId', usuario.id,
             'nomeCompleto', usuario.nome_completo
           ))
           FROM atividade
           INNER JOIN execucao
             ON execucao.atividade_id = atividade.id
             AND execucao.is_deleted = false
             AND execucao.fim_data IS NULL
           INNER JOIN usuario
             ON usuario.id = atividade.usuario_id
             AND usuario.is_deleted = false
           WHERE atividade.demanda_id = caminho_demanda.id
             AND atividade.is_deleted = false
         ), '[]'::json) AS "executoresAtivos"
       FROM caminho_demanda
       INNER JOIN tipo_demanda_status
         ON tipo_demanda_status.id = caminho_demanda.tipo_demanda_status_id
         AND tipo_demanda_status.is_deleted = false
       INNER JOIN demanda
         ON demanda.id = caminho_demanda.id
         AND demanda.is_deleted = false
       WHERE tipo_demanda_status.codigo IN ('PENDENTE', 'PLANEJADA')
       ORDER BY caminho_demanda.caminho ASC`,
      { projetoId: dto.projetoId, separadorCaminho: SEPARADOR_CAMINHO },
    );
  }

  /**
   * Altera campos da demanda e retorna o estado atualizado.
   */
  async alterar(dto: DemandaInternoAlterarDto): Promise<DemandaRecuperadaDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id: dto.id };

    if (dto.demandaPaiId !== undefined) {
      setClauses.push('demanda_pai_id = :demandaPaiId');
      parametros.demandaPaiId = dto.demandaPaiId;
    }
    if (dto.nome !== undefined) {
      setClauses.push('nome = :nome');
      parametros.nome = dto.nome;
    }
    if (dto.descricaoTecnica !== undefined) {
      setClauses.push('descricao_tecnica = :descricaoTecnica');
      parametros.descricaoTecnica = dto.descricaoTecnica;
    }
    if (dto.descricaoCliente !== undefined) {
      setClauses.push('descricao_cliente = :descricaoCliente');
      parametros.descricaoCliente = dto.descricaoCliente;
    }
    if (dto.documentacao !== undefined) {
      setClauses.push('documentacao = :documentacao');
      parametros.documentacao = dto.documentacao;
    }
    if (dto.horasEstimadas !== undefined) {
      setClauses.push('horas_estimadas = :horasEstimadas');
      parametros.horasEstimadas = dto.horasEstimadas;
    }
    if (dto.status !== undefined) {
      setClauses.push(
        'tipo_demanda_status_id = (SELECT tipo_demanda_status.id FROM tipo_demanda_status WHERE tipo_demanda_status.codigo = :status AND tipo_demanda_status.is_deleted = false)',
      );
      parametros.status = dto.status;
    }
    if (dto.isEstrutural !== undefined) {
      setClauses.push('is_estrutural = :isEstrutural');
      parametros.isEstrutural = dto.isEstrutural;
    }
    if (dto.previsaoFimData !== undefined) {
      setClauses.push('previsao_fim_data = :previsaoFimData');
      parametros.previsaoFimData = dto.previsaoFimData;
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
         (SELECT tipo_demanda_status.codigo FROM tipo_demanda_status
            WHERE tipo_demanda_status.id = demanda.tipo_demanda_status_id) AS status,
         is_estrutural      AS "isEstrutural",
         previsao_fim_data  AS "previsaoFimData",
         created_date       AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /**
   * Retorna todos os descendentes de uma demanda em formato plano com nível.
   * Inclui a própria demanda (nível 0). Usa CTE recursivo conforme SCHEMA.md.
   */
  async listarDescendentes(dto: DemandaDescendenteListarDto): Promise<{
    id: number;
    demandaPaiId: number | null;
    nome: string;
    status: TipoDemandaStatusEnum;
    isEstrutural: boolean;
    horasEstimadas: number;
    minutosExecutados: number;
    nivel: number;
    temDescricaoTecnica: boolean;
    temDescricaoCliente: boolean;
    temDocumentacao: boolean;
    tags: TagResumoDto[];
  }[]> {
    return this.executarConsulta<{
      id: number;
      demandaPaiId: number | null;
      nome: string;
      status: TipoDemandaStatusEnum;
      isEstrutural: boolean;
      horasEstimadas: number;
      minutosExecutados: number;
      nivel: number;
      temDescricaoTecnica: boolean;
      temDescricaoCliente: boolean;
      temDocumentacao: boolean;
      tags: TagResumoDto[];
    }>(
      `WITH RECURSIVE arvore_demanda AS (
         SELECT id, demanda_pai_id, nome, is_estrutural,
                horas_estimadas, 0 AS nivel
         FROM demanda
         WHERE id = :demandaId
           AND is_deleted = false

         UNION ALL

         SELECT demanda_filho.id, demanda_filho.demanda_pai_id, demanda_filho.nome,
                demanda_filho.is_estrutural,
                demanda_filho.horas_estimadas, arvore_demanda.nivel + 1
         FROM demanda AS demanda_filho
         INNER JOIN arvore_demanda
           ON demanda_filho.demanda_pai_id = arvore_demanda.id
         WHERE demanda_filho.is_deleted = false
       )
       SELECT
         arvore_demanda.id,
         arvore_demanda.demanda_pai_id  AS "demandaPaiId",
         arvore_demanda.nome,
         tipo_demanda_status.codigo     AS status,
         arvore_demanda.is_estrutural   AS "isEstrutural",
         arvore_demanda.horas_estimadas AS "horasEstimadas",
         COALESCE((
           SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data)) / 60)
           FROM atividade
           INNER JOIN execucao
             ON execucao.atividade_id = atividade.id
             AND execucao.is_deleted = false
           WHERE atividade.demanda_id = demanda.id
             AND atividade.is_deleted = false
         ), 0)::int                     AS "minutosExecutados",
         arvore_demanda.nivel,
         NULLIF(demanda.descricao_tecnica, '') IS NOT NULL AS "temDescricaoTecnica",
         NULLIF(demanda.descricao_cliente,  '') IS NOT NULL AS "temDescricaoCliente",
         NULLIF(demanda.documentacao,        '') IS NOT NULL AS "temDocumentacao",
         COALESCE(
           (
             SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tag.id, 'nome', tag.nome, 'cor', tag.cor))
             FROM demanda_tag
             INNER JOIN tag ON tag.id = demanda_tag.tag_id AND tag.is_deleted = false
             WHERE demanda_tag.demanda_id = arvore_demanda.id AND demanda_tag.is_deleted = false
           ),
           '[]'::json
         ) AS tags
       FROM arvore_demanda
       INNER JOIN demanda ON demanda.id = arvore_demanda.id
       INNER JOIN tipo_demanda_status
         ON tipo_demanda_status.id = demanda.tipo_demanda_status_id
         AND tipo_demanda_status.is_deleted = false
       ORDER BY arvore_demanda.nivel, arvore_demanda.nome`,
      { demandaId: dto.demandaId },
    );
  }

  /**
   * Retorna todos os ancestrais de uma demanda (do pai até a raiz).
   * Usa CTE recursivo invertido. Nível 1 = pai direto.
   */
  async listarAncestral(dto: DemandaAncestralListarDto): Promise<DemandaAncestralDto[]> {
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
      { demandaId: dto.demandaId },
    );
  }

  /** Soft delete da demanda. */
  async excluir(dto: DemandaExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Verifica se o usuário tem acesso ao projeto via demanda_usuario.
   * Acesso derivado: desenvolvedor vê projeto se tiver ao menos uma demanda atribuída.
   */
  async validarAcessoProjeto(dto: DemandaAcessoProjetoVerificarDto): Promise<boolean> {
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
      { projetoId: dto.projetoId, usuarioId: dto.usuarioId },
    );
    return resultado[0].existe;
  }

  /**
   * Retorna todos os nós e arestas do grafo de demandas de um projeto.
   * Nós incluem horasEstimadas e demandaPaiId para renderização no grafo.
   * Arestas incluem relações pai-filho (hierarquia) e conexões explícitas (demanda_conexao).
   */
  async recuperarGrafo(dto: DemandaGrafoRecuperarDto): Promise<DemandaGrafoDto> {
    const nos = await this.executarConsulta<DemandaGrafoNoDto>(
      `SELECT
         demanda.id,
         demanda.nome,
         tipo_demanda_status.codigo AS status,
         demanda.is_estrutural    AS "isEstrutural",
         demanda.horas_estimadas  AS "horasEstimadas",
         COALESCE((
           SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, NOW()) - execucao.inicio_data)) / 60)
           FROM atividade
           INNER JOIN execucao
             ON execucao.atividade_id = atividade.id
             AND execucao.is_deleted = false
           WHERE atividade.demanda_id = demanda.id
             AND atividade.is_deleted = false
         ), 0)::int               AS "minutosExecutados",
         demanda.demanda_pai_id   AS "demandaPaiId",
         NULLIF(demanda.descricao_tecnica, '') IS NOT NULL AS "temDescricaoTecnica",
         NULLIF(demanda.descricao_cliente,  '') IS NOT NULL AS "temDescricaoCliente",
         NULLIF(demanda.documentacao,        '') IS NOT NULL AS "temDocumentacao",
         COALESCE(
           (
             SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tag.id, 'nome', tag.nome, 'cor', tag.cor))
             FROM demanda_tag
             INNER JOIN tag ON tag.id = demanda_tag.tag_id AND tag.is_deleted = false
             WHERE demanda_tag.demanda_id = demanda.id AND demanda_tag.is_deleted = false
           ),
           '[]'::json
         ) AS tags
       FROM demanda
       INNER JOIN tipo_demanda_status
         ON tipo_demanda_status.id = demanda.tipo_demanda_status_id
         AND tipo_demanda_status.is_deleted = false
       WHERE demanda.projeto_id = :projetoId
         AND demanda.is_deleted = false
       ORDER BY demanda.nome ASC`,
      { projetoId: dto.projetoId },
    );

    const arestas = await this.executarConsulta<DemandaGrafoArestaDto>(
      `SELECT
         demanda_conexao.id                   AS "id",
         demanda_conexao.demanda_origem_id    AS "origemId",
         demanda_conexao.demanda_destino_id   AS "destinoId",
         'conexao'                            AS "tipo",
         demanda_conexao.eh_bidirecional      AS "ehBidirecional"
       FROM demanda_conexao
       INNER JOIN demanda AS demanda_origem
         ON demanda_origem.id = demanda_conexao.demanda_origem_id
         AND demanda_origem.projeto_id = :projetoId
         AND demanda_origem.is_deleted = false
       INNER JOIN demanda AS demanda_destino
         ON demanda_destino.id = demanda_conexao.demanda_destino_id
         AND demanda_destino.projeto_id = :projetoId
         AND demanda_destino.is_deleted = false
       WHERE demanda_conexao.is_deleted = false

       UNION ALL

       SELECT
         demanda_filho.id                AS "id",
         demanda_filho.demanda_pai_id    AS "origemId",
         demanda_filho.id                AS "destinoId",
         'hierarquia'                    AS "tipo",
         false                           AS "ehBidirecional"
       FROM demanda AS demanda_filho
       WHERE demanda_filho.projeto_id = :projetoId
         AND demanda_filho.demanda_pai_id IS NOT NULL
         AND demanda_filho.is_deleted = false`,
      { projetoId: dto.projetoId },
    );

    return { nos, arestas };
  }

  /**
   * Verifica se conectar origem → destino criaria um ciclo no grafo.
   * Usa CTE recursivo conforme SCHEMA.md.
   * Retorna true se criaria ciclo.
   */
  async verificarCriariaCiclo(dto: DemandaValidarConexaoDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ criariaCiclo: boolean }>(
      `WITH RECURSIVE verificacao_ciclo AS (
         SELECT demanda_destino_id AS id
         FROM demanda_conexao
         WHERE demanda_origem_id = :destinoId
           AND is_deleted = false

         UNION ALL

         SELECT demanda_conexao_proxima.demanda_destino_id
         FROM demanda_conexao AS demanda_conexao_proxima
         INNER JOIN verificacao_ciclo
           ON demanda_conexao_proxima.demanda_origem_id = verificacao_ciclo.id
         WHERE demanda_conexao_proxima.is_deleted = false
       )
       SELECT EXISTS (
         SELECT 1 FROM verificacao_ciclo WHERE id = :origemId
       ) AS "criariaCiclo"`,
      { destinoId: dto.demandaDestinoId, origemId: dto.demandaOrigemId },
    );
    return resultado[0].criariaCiclo;
  }

  /**
   * Verifica se já existe conexão ativa de origem para destino.
   */
  async validarConexao(dto: DemandaValidarConexaoDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM demanda_conexao
         WHERE demanda_origem_id = :demandaOrigemId
           AND demanda_destino_id = :demandaDestinoId
           AND is_deleted = false
       ) AS existe`,
      { demandaOrigemId: dto.demandaOrigemId, demandaDestinoId: dto.demandaDestinoId },
    );
    return resultado[0].existe;
  }

  /**
   * Insere nova conexão entre demandas.
   */
  async inserirConexao(dados: {
    demandaOrigemId: number;
    demandaDestinoId: number;
    ehBidirecional: boolean;
  }): Promise<DemandaConexaoCriadaDto> {
    const resultado = await this.executarConsulta<DemandaConexaoCriadaDto>(
      `INSERT INTO demanda_conexao (
         demanda_origem_id, demanda_destino_id, eh_bidirecional,
         created_date, updated_date, is_deleted
       )
       SELECT
         :demandaOrigemId, :demandaDestinoId, :ehBidirecional,
         NOW(), NOW(), false
       RETURNING
         id,
         demanda_origem_id  AS "demandaOrigemId",
         demanda_destino_id AS "demandaDestinoId",
         eh_bidirecional    AS "ehBidirecional",
         created_date       AS "createdDate"`,
      {
        demandaOrigemId:  dados.demandaOrigemId,
        demandaDestinoId: dados.demandaDestinoId,
        ehBidirecional:   dados.ehBidirecional,
      },
    );
    return resultado[0];
  }

  /**
   * Lista todas as conexões de uma demanda (saída, entrada bidirecional).
   */
  async listarConexoes(dto: DemandaConexaoListarDto): Promise<DemandaConexaoResumoDto[]> {
    return this.executarConsulta<DemandaConexaoResumoDto>(
      `SELECT
         demanda_conexao.id,
         CASE
           WHEN demanda_conexao.demanda_origem_id = :demandaId THEN demanda_conexao.demanda_destino_id
           ELSE demanda_conexao.demanda_origem_id
         END AS "demandaConectadaId",
         demanda_conectada.nome AS "nomeDemandaConectada",
         CASE
           WHEN demanda_conexao.eh_bidirecional = true THEN 'bidirecional'
           WHEN demanda_conexao.demanda_origem_id = :demandaId THEN 'saida'
           ELSE 'entrada'
         END AS direcao
       FROM demanda_conexao
       INNER JOIN demanda AS demanda_conectada
         ON demanda_conectada.id = CASE
           WHEN demanda_conexao.demanda_origem_id = :demandaId THEN demanda_conexao.demanda_destino_id
           ELSE demanda_conexao.demanda_origem_id
         END
         AND demanda_conectada.is_deleted = false
       WHERE demanda_conexao.is_deleted = false
         AND (
           demanda_conexao.demanda_origem_id = :demandaId
           OR (demanda_conexao.demanda_destino_id = :demandaId AND demanda_conexao.eh_bidirecional = true)
         )`,
      { demandaId: dto.demandaId },
    );
  }

  /**
   * Remove uma conexão pelo ID via soft delete.
   */
  async excluirConexao(dto: DemandaConexaoExcluirDto): Promise<void> {
    await this.executarComando(
      `UPDATE demanda_conexao
       SET is_deleted = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE id = :conexaoId`,
      { conexaoId: dto.conexaoId },
    );
  }

  /**
   * Verifica se a conexão pertence à demanda informada (como origem ou destino bidirecional).
   */
  async validarConexaoDemanda(dto: DemandaConexaoVerificarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM demanda_conexao
         WHERE id = :conexaoId
           AND is_deleted = false
           AND (
             demanda_origem_id = :demandaId
             OR (demanda_destino_id = :demandaId AND eh_bidirecional = true)
           )
       ) AS existe`,
      { conexaoId: dto.conexaoId, demandaId: dto.demandaId },
    );
    return resultado[0].existe;
  }

  /**
   * Lista as tags ativas atribuídas a uma demanda.
   */
  async listarTagsDemanda(dto: DemandaTagsListarDto): Promise<TagResumoDto[]> {
    return this.executarConsulta<TagResumoDto>(
      `SELECT
         tag.id,
         tag.nome,
         tag.cor
       FROM demanda_tag
       INNER JOIN tag
         ON tag.id = demanda_tag.tag_id
         AND tag.is_deleted = false
       WHERE demanda_tag.demanda_id = :demandaId
         AND demanda_tag.is_deleted = false`,
      { demandaId: dto.demandaId },
    );
  }

  /**
   * Sincroniza as tags de uma demanda com a nova lista de IDs.
   * Faz soft delete das tags removidas e insere as novas.
   * Tags que já existem e permanecem na lista não são tocadas.
   */
  async atribuirTagsDemanda(dto: DemandaTagsInternoAtribuirDto): Promise<void> {
    const tagsAtuais = await this.listarTagsDemanda({ demandaId: dto.demandaId });
    const idsAtuais  = tagsAtuais.map((tag) => tag.id);

    const idsParaRemover = idsAtuais.filter((id) => !dto.tagIds.includes(id));
    const idsParaInserir = dto.tagIds.filter((id) => !idsAtuais.includes(id));

    for (const tagId of idsParaRemover) {
      await this.removerTagDemanda({ demandaId: dto.demandaId, tagId });
    }

    for (const tagId of idsParaInserir) {
      await this.executarComando(
        `INSERT INTO demanda_tag (demanda_id, tag_id, created_date, updated_date, is_deleted)
         SELECT :demandaId, :tagId, NOW(), NOW(), false`,
        { demandaId: dto.demandaId, tagId },
      );
    }
  }

  /**
   * Remove (soft delete) a associação de uma tag à demanda.
   */
  async removerTagDemanda(dto: DemandaTagInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `UPDATE demanda_tag
       SET is_deleted   = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE demanda_id = :demandaId
         AND tag_id     = :tagId
         AND is_deleted = false`,
      { demandaId: dto.demandaId, tagId: dto.tagId },
    );
  }

  /**
   * Lista os membros ativos de uma demanda com dados do usuário.
   */
  async listarMembrosDemanda(dto: DemandaMembroListarDto): Promise<DemandaMembroDto[]> {
    return this.executarConsulta<DemandaMembroDto>(
      `SELECT
         usuario.id         AS "usuarioId",
         usuario.nome_completo AS "nomeCompleto",
         usuario.login,
         tipo_usuario.codigo   AS tipo,
         usuario.cargo_titulo  AS "cargoTitulo"
       FROM demanda_usuario
       INNER JOIN usuario
         ON usuario.id = demanda_usuario.usuario_id
         AND usuario.is_deleted = false
       INNER JOIN tipo_usuario
         ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       WHERE demanda_usuario.demanda_id = :demandaId
         AND demanda_usuario.is_deleted = false`,
      { demandaId: dto.demandaId },
    );
  }

  /**
   * Atribui um usuário à demanda.
   */
  async atribuirMembroDemanda(dto: DemandaMembroInternoAtribuirDto): Promise<void> {
    await this.executarComando(
      `INSERT INTO demanda_usuario (demanda_id, usuario_id, created_date, updated_date, is_deleted)
       SELECT :demandaId, :usuarioId, NOW(), NOW(), false`,
      { demandaId: dto.demandaId, usuarioId: dto.usuarioId },
    );
  }

  /**
   * Remove (soft delete) a atribuição de um usuário à demanda.
   */
  async removerMembroDemanda(dto: DemandaMembroInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `UPDATE demanda_usuario
       SET is_deleted   = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE demanda_id = :demandaId
         AND usuario_id = :usuarioId
         AND is_deleted = false`,
      { demandaId: dto.demandaId, usuarioId: dto.usuarioId },
    );
  }

  /**
   * Verifica se um usuário já está atribuído à demanda.
   */
  async validarMembro(dto: DemandaMembroVerificarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM demanda_usuario
         WHERE demanda_id = :demandaId
           AND usuario_id = :usuarioId
           AND is_deleted = false
       ) AS existe`,
      { demandaId: dto.demandaId, usuarioId: dto.usuarioId },
    );
    return resultado[0].existe;
  }

  /**
   * Conta o total de membros ativos em uma demanda.
   * Usado para impedir remoção do último membro.
   */
  async contarMembrosDemanda(dto: DemandaMembroListarDto): Promise<number> {
    const resultado = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM demanda_usuario
       WHERE demanda_id = :demandaId
         AND is_deleted = false`,
      { demandaId: dto.demandaId },
    );
    return resultado[0].total;
  }
}
