import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { Projeto } from '../domain/models/projeto.model';
import {
  ProjetoCriadoDto,
  ProjetoRecuperadoDto,
  ProjetoResumoDto,
  ProjetoAlteradoDto,
  ProjetoValidarCodigoDto,
  ProjetoListarDto,
  ProjetoRecuperarDto,
  ProjetoInternoAlterarDto,
  ProjetoExcluirDto,
  ProjetoUsuarioListarDto,
  ProjetoAcessoValidarDto,
  ProjetoVolumeFiltrarDto,
  ProjetoVolumeResumoDto,
  ProjetoVolumeMesDto,
} from '@project20/shared';
import { ProjetoRestaurarDto, ProjetoRestauradoDto } from '@project20/shared';

type ProjetoCriarDados = Omit<Projeto, 'id' | 'isDeleted' | 'createdDate' | 'updatedDate' | 'deletedDate'>;

@Injectable()
export class ProjetoRepository extends BaseRepository<Projeto> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'projeto');
  }

  /** Verifica se já existe projeto ativo com o mesmo código. */
  async validarCodigo(dto: ProjetoValidarCodigoDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM projeto
         WHERE projeto.codigo = :codigo
           AND projeto.is_deleted = false
       ) AS existe`,
      { codigo: dto.codigo },
    );
    return resultado[0].existe;
  }

  /** Insere novo projeto e retorna os dados do projeto criado. */
  async inserir(dados: ProjetoCriarDados): Promise<ProjetoCriadoDto> {
    const resultado = await this.executarConsulta<ProjetoCriadoDto>(
      `INSERT INTO projeto (nome, codigo, cor, tipo_projeto_status_id, inicio_data, previsao_fim_data, created_date, updated_date, is_deleted)
       SELECT :nome, :codigo, :cor,
         (SELECT tipo_projeto_status.id FROM tipo_projeto_status
            WHERE tipo_projeto_status.codigo = :status AND tipo_projeto_status.is_deleted = false),
         :inicioData, :previsaoFimData, NOW(), NOW(), false
       RETURNING
         id,
         nome,
         codigo,
         cor,
         (SELECT tipo_projeto_status.codigo FROM tipo_projeto_status
            WHERE tipo_projeto_status.id = projeto.tipo_projeto_status_id) AS status,
         inicio_data::text       AS "inicioData",
         previsao_fim_data::text AS "previsaoFimData",
         created_date            AS "createdDate"`,
      {
        nome:            dados.nome,
        codigo:          dados.codigo,
        cor:             dados.cor,
        status:          dados.status,
        inicioData:      dados.inicioData ?? null,
        previsaoFimData: dados.previsaoFimData ?? null,
      },
    );
    return resultado[0];
  }

  /** Recupera projeto por ID. Retorna null se não encontrado ou deletado. */
  async recuperar(dto: ProjetoRecuperarDto): Promise<ProjetoRecuperadoDto | null> {
    const resultado = await this.executarConsulta<ProjetoRecuperadoDto>(
      `SELECT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         tipo_projeto_status.codigo      AS status,
         projeto.inicio_data::text       AS "inicioData",
         projeto.previsao_fim_data::text AS "previsaoFimData",
         projeto.created_date            AS "createdDate"
       FROM projeto
       INNER JOIN tipo_projeto_status
         ON tipo_projeto_status.id = projeto.tipo_projeto_status_id
         AND tipo_projeto_status.is_deleted = false
       WHERE projeto.id = :id
         AND projeto.is_deleted = false
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /** Lista todos os projetos ativos com filtros opcionais (para gestores). */
  async listarTodos(filtros: ProjetoListarDto): Promise<{ itens: ProjetoResumoDto[]; total: number }> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = {};
    const condicoes: string[] = ['projeto.is_deleted = false'];

    if (filtros.status !== undefined) {
      condicoes.push('tipo_projeto_status.codigo = :status');
      parametros.status = filtros.status;
    }

    const clausulaWhere = condicoes.join(' AND ');
    const clausulaJoin = `
       INNER JOIN tipo_projeto_status
         ON tipo_projeto_status.id = projeto.tipo_projeto_status_id
         AND tipo_projeto_status.is_deleted = false`;

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM projeto
       ${clausulaJoin}
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const clausulaPaginacao = filtros.allRows
      ? ''
      : `LIMIT ${itensPorPagina} OFFSET ${(pagina - 1) * itensPorPagina}`;
    const itens = await this.executarConsulta<ProjetoResumoDto>(
      `SELECT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         tipo_projeto_status.codigo AS status
       FROM projeto
       ${clausulaJoin}
       WHERE ${clausulaWhere}
       ORDER BY projeto.nome ASC
       ${clausulaPaginacao}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Volume do mês (task 197): por projeto, os minutos das execuções **encerradas** cujo início cai no intervalo e o volume esperado.
   * O dia da execução é o de `inicio_data` no fuso da sessão (o do sistema), o mesmo critério do relatório; execução em andamento
   * não entra. Projeto sem execução no mês volta com 0 minutos.
   */
  async listarVolume(filtros: ProjetoVolumeFiltrarDto): Promise<ProjetoVolumeResumoDto[]> {
    return this.executarConsulta<ProjetoVolumeResumoDto>(
      `SELECT
         projeto.id                                  AS "projetoId",
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         COALESCE(execucao_do_mes.minutos_gastos, 0) AS "minutosGastos",
         volume_vigente.volume_esperado_horas        AS "volumeEsperadoHorasMes"
       FROM projeto
       LEFT JOIN LATERAL (
         SELECT projeto_volume_vigencia.volume_esperado_horas
         FROM projeto_volume_vigencia
         WHERE projeto_volume_vigencia.projeto_id = projeto.id
           AND projeto_volume_vigencia.is_deleted = false
           AND projeto_volume_vigencia.vigencia_inicio_data <= :dataInicio::date
         ORDER BY projeto_volume_vigencia.vigencia_inicio_data DESC LIMIT 1
       ) AS volume_vigente ON true
       LEFT JOIN (
         SELECT
           demanda.projeto_id AS projeto_id,
           SUM(EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60)::int AS minutos_gastos
         FROM execucao
         INNER JOIN atividade
           ON atividade.id = execucao.atividade_id
           AND atividade.is_deleted = false
         INNER JOIN demanda
           ON demanda.id = atividade.demanda_id
           AND demanda.is_deleted = false
         WHERE execucao.is_deleted = false
           AND execucao.fim_data IS NOT NULL
           AND DATE(execucao.inicio_data) BETWEEN :dataInicio::DATE AND :dataFim::DATE
         GROUP BY demanda.projeto_id
       ) AS execucao_do_mes
         ON execucao_do_mes.projeto_id = projeto.id
       WHERE projeto.is_deleted = false
       ORDER BY projeto.nome ASC`,
      { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim },
    );
  }

  /**
   * Volume do ano (task 199): uma linha por projeto não excluído e por mês (1 a 12), com os minutos das execuções **encerradas** daquele
   * mês, pelo mesmo critério de dia da visão mensal (`inicio_data` no fuso da sessão). Mês sem execução volta com 0.
   */
  async listarVolumePorMes(filtros: ProjetoVolumeFiltrarDto): Promise<ProjetoVolumeMesDto[]> {
    return this.executarConsulta<ProjetoVolumeMesDto>(
      `SELECT
         projeto.id                                  AS "projetoId",
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         volume_vigente.volume_esperado_horas        AS "volumeEsperadoHorasMes",
         mes_do_ano.mes                              AS "mes",
         COALESCE(execucao_do_mes.minutos_gastos, 0) AS "minutosGastos"
       FROM projeto
       CROSS JOIN generate_series(1, 12) AS mes_do_ano(mes)
       LEFT JOIN LATERAL (
         SELECT projeto_volume_vigencia.volume_esperado_horas
         FROM projeto_volume_vigencia
         WHERE projeto_volume_vigencia.projeto_id = projeto.id
           AND projeto_volume_vigencia.is_deleted = false
           AND projeto_volume_vigencia.vigencia_inicio_data <= make_date(EXTRACT(YEAR FROM :dataInicio::date)::int, mes_do_ano.mes, 1)
         ORDER BY projeto_volume_vigencia.vigencia_inicio_data DESC LIMIT 1
       ) AS volume_vigente ON true
       LEFT JOIN (
         SELECT
           demanda.projeto_id AS projeto_id,
           EXTRACT(MONTH FROM execucao.inicio_data)::int AS mes,
           SUM(EXTRACT(EPOCH FROM (execucao.fim_data - execucao.inicio_data))::int / 60)::int AS minutos_gastos
         FROM execucao
         INNER JOIN atividade
           ON atividade.id = execucao.atividade_id
           AND atividade.is_deleted = false
         INNER JOIN demanda
           ON demanda.id = atividade.demanda_id
           AND demanda.is_deleted = false
         WHERE execucao.is_deleted = false
           AND execucao.fim_data IS NOT NULL
           AND DATE(execucao.inicio_data) BETWEEN :dataInicio::DATE AND :dataFim::DATE
         GROUP BY demanda.projeto_id, EXTRACT(MONTH FROM execucao.inicio_data)
       ) AS execucao_do_mes
         ON execucao_do_mes.projeto_id = projeto.id
         AND execucao_do_mes.mes = mes_do_ano.mes
       WHERE projeto.is_deleted = false
       ORDER BY projeto.nome ASC, projeto.id ASC, mes_do_ano.mes ASC`,
      { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim },
    );
  }

  /**
   * Lista projetos onde o usuário tem ao menos uma demanda atribuída (para desenvolvedores).
   * Acesso derivado de demanda_usuario — não existe tabela projeto_usuario.
   */
  async listarPorUsuario(
    dto: ProjetoUsuarioListarDto,
  ): Promise<{ itens: ProjetoResumoDto[]; total: number }> {
    const pagina         = dto.filtros.pagina ?? 1;
    const itensPorPagina = dto.filtros.itensPorPagina ?? 20;
    const parametros: Record<string, unknown> = { usuarioId: dto.usuarioId };
    const condicoesExtras: string[] = [];

    if (dto.filtros.status !== undefined) {
      condicoesExtras.push('AND tipo_projeto_status.codigo = :status');
      parametros.status = dto.filtros.status;
    }

    const filtroStatus = condicoesExtras.join(' ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(DISTINCT projeto.id)::int AS total
       FROM projeto
       INNER JOIN tipo_projeto_status
         ON tipo_projeto_status.id = projeto.tipo_projeto_status_id
         AND tipo_projeto_status.is_deleted = false
       INNER JOIN demanda
         ON demanda.projeto_id = projeto.id
         AND demanda.is_deleted = false
       INNER JOIN demanda_usuario
         ON demanda_usuario.demanda_id = demanda.id
         AND demanda_usuario.is_deleted = false
       WHERE projeto.is_deleted = false
         AND demanda_usuario.usuario_id = :usuarioId
         ${filtroStatus}`,
      parametros,
    );

    const clausulaPaginacao = dto.filtros.allRows
      ? ''
      : `LIMIT ${itensPorPagina} OFFSET ${(pagina - 1) * itensPorPagina}`;
    const itens = await this.executarConsulta<ProjetoResumoDto>(
      `SELECT DISTINCT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         tipo_projeto_status.codigo AS status
       FROM projeto
       INNER JOIN tipo_projeto_status
         ON tipo_projeto_status.id = projeto.tipo_projeto_status_id
         AND tipo_projeto_status.is_deleted = false
       INNER JOIN demanda
         ON demanda.projeto_id = projeto.id
         AND demanda.is_deleted = false
       INNER JOIN demanda_usuario
         ON demanda_usuario.demanda_id = demanda.id
         AND demanda_usuario.is_deleted = false
       WHERE projeto.is_deleted = false
         AND demanda_usuario.usuario_id = :usuarioId
         ${filtroStatus}
       ORDER BY projeto.nome ASC
       ${clausulaPaginacao}`,
      parametros,
    );

    return { itens, total };
  }

  /**
   * Verifica se o usuário tem ao menos uma demanda (não excluída) atribuída no projeto: o acesso do desenvolvedor a UM projeto.
   * Pergunta direto, sem passar pela listagem paginada.
   */
  async validarAcesso(dto: ProjetoAcessoValidarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM demanda
         INNER JOIN demanda_usuario
           ON demanda_usuario.demanda_id = demanda.id
           AND demanda_usuario.is_deleted = false
         INNER JOIN projeto
           ON projeto.id = demanda.projeto_id
           AND projeto.is_deleted = false
         WHERE demanda.projeto_id = :projetoId
           AND demanda.is_deleted = false
           AND demanda_usuario.usuario_id = :usuarioId
       ) AS existe`,
      { projetoId: dto.projetoId, usuarioId: dto.usuarioId },
    );
    return resultado[0].existe;
  }

  /** Altera campos do projeto. O código não pode ser alterado. */
  async alterar(dto: ProjetoInternoAlterarDto): Promise<ProjetoAlteradoDto> {
    const setClauses: string[] = ['updated_date = NOW()'];
    const parametros: Record<string, unknown> = { id: dto.id };

    if (dto.nome !== undefined) {
      setClauses.push('nome = :nome');
      parametros.nome = dto.nome;
    }
    if (dto.cor !== undefined) {
      setClauses.push('cor = :cor');
      parametros.cor = dto.cor;
    }
    if (dto.status !== undefined) {
      setClauses.push(
        'tipo_projeto_status_id = (SELECT tipo_projeto_status.id FROM tipo_projeto_status WHERE tipo_projeto_status.codigo = :status AND tipo_projeto_status.is_deleted = false)',
      );
      parametros.status = dto.status;
    }
    if (dto.inicioData !== undefined) {
      setClauses.push('inicio_data = :inicioData');
      parametros.inicioData = dto.inicioData;
    }
    if (dto.previsaoFimData !== undefined) {
      setClauses.push('previsao_fim_data = :previsaoFimData');
      parametros.previsaoFimData = dto.previsaoFimData;
    }

    const resultado = await this.executarConsulta<ProjetoAlteradoDto>(
      `UPDATE projeto
       SET ${setClauses.join(', ')}
       WHERE projeto.id = :id
         AND projeto.is_deleted = false
       RETURNING
         id,
         nome,
         codigo,
         cor,
         (SELECT tipo_projeto_status.codigo FROM tipo_projeto_status
            WHERE tipo_projeto_status.id = projeto.tipo_projeto_status_id) AS status,
         inicio_data::text       AS "inicioData",
         previsao_fim_data::text AS "previsaoFimData",
         created_date            AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Verifica se o projeto tem alguma demanda ativa (desfazer a criação pela IA só vale com o projeto ainda vazio). */
  async possuiDemandas(dto: ProjetoRecuperarDto): Promise<boolean> {
    const resultado = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM demanda
         WHERE demanda.projeto_id = :projetoId
           AND demanda.is_deleted = false
       ) AS existe`,
      { projetoId: dto.id },
    );
    return resultado[0].existe;
  }

  /** Soft delete do projeto. */
  async excluir(dto: ProjetoExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Recupera o projeto **excluído**. É a única leitura que filtra `is_deleted = true`: a restauração
   * precisa do registro apagado para validar unicidade e dependências antes de reativá-lo.
   */
  async recuperarExcluido(dto: ProjetoRestaurarDto): Promise<(ProjetoRestauradoDto) | null> {
    const resultado = await this.executarConsulta<ProjetoRestauradoDto>(
      `SELECT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor
       FROM projeto
       WHERE projeto.id = :id
         AND projeto.is_deleted = true
       LIMIT 1`,
      { id: dto.id },
    );
    return resultado[0] ?? null;
  }

  /** Restaura o projeto: desfaz o soft delete (sem DELETE físico e sem cascata). */
  async restaurar(dto: ProjetoRestaurarDto): Promise<ProjetoRestauradoDto> {
    const resultado = await this.executarConsulta<ProjetoRestauradoDto>(
      `UPDATE projeto
       SET is_deleted = false,
           deleted_date = NULL,
           updated_date = NOW()
       WHERE projeto.id = :id
         AND projeto.is_deleted = true
       RETURNING
         id,
         nome,
         codigo,
         cor`,
      { id: dto.id },
    );
    return resultado[0];
  }
}
