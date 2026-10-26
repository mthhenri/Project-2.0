import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Plano } from '../domain/models/plano.model';
import {
  PlanoAlteradoDto,
  PlanoArquivadoDto,
  PlanoRecuperadoDto,
  PlanoRecuperarDto,
  PlanoResumoDto,
  PlanoSoloMarcadoDto,
} from '@project20/shared';

/** Plano com a descrição do cliente sempre presente: quem a esconde de quem não pode vê-la é a service. */
export type PlanoCompletoDto = PlanoRecuperadoDto & { descricaoCliente: string | null };

/** Quem lista e o que a lista precisa saber sobre a pessoa. */
interface PlanoListarDados {
  usuarioId: number;
  /** Gestor e administrador veem os planos de todos os projetos; desenvolvedor, os dos projetos em que está em alguma demanda. */
  ehGestor: boolean;
  busca?: string;
  incluirArquivados?: boolean;
  projetoId?: number;
}

interface PlanoInserirDados {
  titulo: string;
  projetoId: number | null;
  usuarioId: number;
}

interface PlanoAlterarDados {
  id: number;
  versao: number;
  titulo?: string;
  descricaoTecnica?: string | null;
  descricaoCliente?: string | null;
  documentacao?: string | null;
}

/**
 * Colunas e junções do plano. A demanda só conta se a ligação e a demanda estão ativas, e o projeto só se não foi excluído: demanda excluída
 * deixa o plano sem demanda e projeto excluído leva os planos dele (a leitura os esconde; restaurar o projeto os traz de volta).
 */
const SELECT_PLANO = `
  SELECT
    plano.id,
    plano.titulo,
    plano.projeto_id                  AS "projetoId",
    projeto.nome                      AS "projetoNome",
    plano_demanda.demanda_id          AS "demandaId",
    demanda.nome                      AS "demandaNome",
    plano_demanda.publicacao_data     AS "publicacaoData",
    plano.usuario_id                  AS "criadorId",
    usuario_criador.nome_completo     AS "criadorNome",
    plano.is_solo                     AS "isSolo",
    plano.is_arquivado                AS "isArquivado",
    plano.descricao_tecnica           AS "descricaoTecnica",
    plano.descricao_cliente           AS "descricaoCliente",
    plano.documentacao,
    plano.versao,
    plano.created_date                AS "createdDate",
    plano.updated_date                AS "updatedDate"
  FROM plano
  INNER JOIN usuario AS usuario_criador
    ON usuario_criador.id = plano.usuario_id
   AND usuario_criador.is_deleted = false
  LEFT JOIN projeto
    ON projeto.id = plano.projeto_id
   AND projeto.is_deleted = false
  LEFT JOIN (
    plano_demanda
    INNER JOIN demanda
      ON demanda.id = plano_demanda.demanda_id
     AND demanda.is_deleted = false
  )
    ON plano_demanda.plano_id = plano.id
   AND plano_demanda.is_deleted = false`;

const PLANO_DE_PROJETO_ATIVO = '(plano.projeto_id IS NULL OR projeto.id IS NOT NULL)';

@Injectable()
export class PlanoRepository extends BaseRepository<Plano> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'plano');
  }

  /** Insere o plano (versão 1, sem textos, compartilhado e fora do arquivo) e devolve o id. */
  async inserir(dados: PlanoInserirDados): Promise<PlanoRecuperarDto> {
    const resultado = await this.executarConsulta<PlanoRecuperarDto>(
      `INSERT INTO plano (
         titulo, projeto_id, usuario_id, is_solo, is_arquivado,
         descricao_tecnica, descricao_cliente, documentacao, versao,
         created_date, updated_date, is_deleted
       )
       SELECT :titulo, :projetoId, :usuarioId, false, false, NULL, NULL, NULL, 1, NOW(), NOW(), false
       RETURNING id`,
      { titulo: dados.titulo, projetoId: dados.projetoId, usuarioId: dados.usuarioId },
    );
    return resultado[0];
  }

  /** Recupera o plano ativo (de projeto ativo) com os três textos. Não aplica regra de acesso. */
  async recuperar(dto: PlanoRecuperarDto): Promise<PlanoCompletoDto | null> {
    const resultado = await this.executarConsulta<PlanoCompletoDto>(
      `${SELECT_PLANO}
       WHERE plano.id = :id
         AND plano.is_deleted = false
         AND ${PLANO_DE_PROJETO_ATIVO}
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /**
   * Lista os planos que a pessoa vê, do mais recente para o mais antigo. Plano amplo e plano solo, só do criador; plano de projeto,
   * de quem tem acesso ao projeto (a mesma regra de `podeAcessarPlano`, do `shared`). Arquivado só aparece com `incluirArquivados` ou com busca.
   */
  async listar(dados: PlanoListarDados): Promise<PlanoResumoDto[]> {
    const parametros: Record<string, unknown> = { usuarioId: dados.usuarioId };
    const acessoAoProjeto = dados.ehGestor
      ? 'true'
      : `EXISTS (
           SELECT 1
           FROM demanda AS demanda_do_projeto
           INNER JOIN demanda_usuario
             ON demanda_usuario.demanda_id = demanda_do_projeto.id
            AND demanda_usuario.usuario_id = :usuarioId
            AND demanda_usuario.is_deleted = false
           WHERE demanda_do_projeto.projeto_id = plano.projeto_id
             AND demanda_do_projeto.is_deleted = false
         )`;
    const condicoes = [
      'plano.is_deleted = false',
      PLANO_DE_PROJETO_ATIVO,
      `(
         (plano.projeto_id IS NULL AND plano.usuario_id = :usuarioId)
         OR (plano.projeto_id IS NOT NULL AND plano.is_solo = true AND plano.usuario_id = :usuarioId)
         OR (plano.projeto_id IS NOT NULL AND plano.is_solo = false AND ${acessoAoProjeto})
       )`,
    ];

    const busca = dados.busca?.trim();
    if (busca) {
      condicoes.push('plano.titulo ILIKE :busca');
      parametros.busca = `%${busca.replace(/[\\%_]/g, '\\$&')}%`;
    }
    if (!dados.incluirArquivados && !busca) condicoes.push('plano.is_arquivado = false');
    if (dados.projetoId !== undefined) {
      condicoes.push('plano.projeto_id = :projetoId');
      parametros.projetoId = dados.projetoId;
    }

    return this.executarConsulta<PlanoResumoDto>(
      `SELECT recorte.id, recorte.titulo, recorte."projetoId", recorte."projetoNome", recorte."demandaId", recorte."demandaNome",
              recorte."criadorId", recorte."criadorNome", recorte."isSolo", recorte."isArquivado", recorte."updatedDate"
       FROM (
         ${SELECT_PLANO}
         WHERE ${condicoes.join(' AND ')}
       ) AS recorte
       ORDER BY recorte."updatedDate" DESC, recorte.id DESC`,
      parametros,
    );
  }

  /**
   * Grava o documento só se a versão ainda é a lida (comparação e gravação no mesmo UPDATE: duas pessoas gravando juntas nunca se sobrescrevem).
   * Devolve `null` quando a versão mudou. Campo ausente não é tocado; `null` limpa o texto.
   */
  async alterar(dados: PlanoAlterarDados): Promise<PlanoAlteradoDto | null> {
    const atribuicoes: string[] = ['versao = versao + 1', 'updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id: dados.id, versao: dados.versao };

    if (dados.titulo !== undefined) {
      atribuicoes.push('titulo = :titulo');
      parametros.titulo = dados.titulo;
    }
    if (dados.descricaoTecnica !== undefined) {
      atribuicoes.push('descricao_tecnica = :descricaoTecnica');
      parametros.descricaoTecnica = dados.descricaoTecnica;
    }
    if (dados.descricaoCliente !== undefined) {
      atribuicoes.push('descricao_cliente = :descricaoCliente');
      parametros.descricaoCliente = dados.descricaoCliente;
    }
    if (dados.documentacao !== undefined) {
      atribuicoes.push('documentacao = :documentacao');
      parametros.documentacao = dados.documentacao;
    }

    const resultado = await this.executarConsulta<PlanoAlteradoDto>(
      `UPDATE plano
       SET ${atribuicoes.join(', ')}
       WHERE id = :id
         AND versao = :versao
         AND is_deleted = false
       RETURNING id, titulo, versao, updated_date AS "updatedDate"`,
      parametros,
    );
    return resultado[0] ?? null;
  }

  /** Marca ou desmarca o plano como solo. */
  async marcarSolo(dados: { id: number; isSolo: boolean }): Promise<PlanoSoloMarcadoDto> {
    const resultado = await this.executarConsulta<PlanoSoloMarcadoDto>(
      `UPDATE plano
       SET is_solo = :isSolo, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, is_solo AS "isSolo"`,
      { id: dados.id, isSolo: dados.isSolo },
    );
    return resultado[0];
  }

  /** Arquiva ou devolve o plano ao seletor. */
  async arquivar(dados: { id: number; isArquivado: boolean }): Promise<PlanoArquivadoDto> {
    const resultado = await this.executarConsulta<PlanoArquivadoDto>(
      `UPDATE plano
       SET is_arquivado = :isArquivado, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, is_arquivado AS "isArquivado"`,
      { id: dados.id, isArquivado: dados.isArquivado },
    );
    return resultado[0];
  }

  /** Dá um projeto ao plano amplo. Só age sobre plano sem projeto; devolve `false` se ele já tinha um. */
  async atribuirProjeto(dados: { id: number; projetoId: number }): Promise<boolean> {
    const resultado = await this.executarConsulta<{ id: number }>(
      `UPDATE plano
       SET projeto_id = :projetoId, updated_date = NOW()
       WHERE id = :id AND projeto_id IS NULL AND is_deleted = false
       RETURNING id`,
      { id: dados.id, projetoId: dados.projetoId },
    );
    return resultado.length > 0;
  }

  /** Liga o plano à demanda no lugar da ligação anterior (uma por plano), numa transação. */
  async ligarDemanda(dados: { planoId: number; demandaId: number }): Promise<void> {
    await this.conexaoBancoDados.transaction(async (transacao) => {
      await this.executarComando(
        `UPDATE plano_demanda
         SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
         WHERE plano_id = :planoId AND is_deleted = false`,
        { planoId: dados.planoId },
        transacao,
      );
      await this.executarComando(
        `INSERT INTO plano_demanda (plano_id, demanda_id, publicacao_data, created_date, updated_date, is_deleted)
         SELECT :planoId, :demandaId, NULL, NOW(), NOW(), false`,
        { planoId: dados.planoId, demandaId: dados.demandaId },
        transacao,
      );
    });
  }

  /** Marca que o plano foi publicado agora na demanda ligada. Devolve o instante, ou `null` se o plano não tem ligação ativa. */
  async marcarPublicacao(dados: { planoId: number }): Promise<string | null> {
    const resultado = await this.executarConsulta<{ publicacaoData: string }>(
      `UPDATE plano_demanda
       SET publicacao_data = NOW(), updated_date = NOW()
       WHERE plano_id = :planoId AND is_deleted = false
       RETURNING publicacao_data AS "publicacaoData"`,
      { planoId: dados.planoId },
    );
    return resultado[0]?.publicacaoData ?? null;
  }

  /** Os planos ativos ligados à demanda (do mais recente ao mais antigo); quem os pode ver é a service. */
  async listarPorDemanda(dados: { demandaId: number }): Promise<PlanoCompletoDto[]> {
    return this.executarConsulta<PlanoCompletoDto>(
      `${SELECT_PLANO}
       WHERE plano_demanda.demanda_id = :demandaId
         AND plano.is_deleted = false
         AND ${PLANO_DE_PROJETO_ATIVO}
       ORDER BY plano.updated_date DESC, plano.id DESC`,
      { demandaId: dados.demandaId },
    );
  }

  /** Soft delete do plano e da ligação dele com a demanda, numa transação. */
  async excluir(dto: PlanoRecuperarDto): Promise<void> {
    await this.conexaoBancoDados.transaction(async (transacao) => {
      await this.executarComando(
        `UPDATE plano_demanda
         SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
         WHERE plano_id = :id AND is_deleted = false`,
        { id: dto.id },
        transacao,
      );
      await this.executarComando(
        `UPDATE plano
         SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
         WHERE id = :id`,
        { id: dto.id },
        transacao,
      );
    });
  }
}
