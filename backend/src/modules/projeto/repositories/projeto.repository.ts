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
} from '@project20/shared';

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
      `INSERT INTO projeto (nome, codigo, cor, status, inicio_data, previsao_fim_data, created_date, updated_date, is_deleted)
       SELECT :nome, :codigo, :cor, :status, :inicioData, :previsaoFimData, NOW(), NOW(), false
       RETURNING
         id,
         nome,
         codigo,
         cor,
         status,
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
         projeto.status,
         projeto.inicio_data::text       AS "inicioData",
         projeto.previsao_fim_data::text AS "previsaoFimData",
         projeto.created_date            AS "createdDate"
       FROM projeto
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
      condicoes.push('projeto.status = :status');
      parametros.status = filtros.status;
    }

    const clausulaWhere = condicoes.join(' AND ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM projeto
       WHERE ${clausulaWhere}`,
      parametros,
    );

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<ProjetoResumoDto>(
      `SELECT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         projeto.status
       FROM projeto
       WHERE ${clausulaWhere}
       ORDER BY projeto.nome ASC
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
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
      condicoesExtras.push('AND projeto.status = :status');
      parametros.status = dto.filtros.status;
    }

    const filtroStatus = condicoesExtras.join(' ');

    const [{ total }] = await this.executarConsulta<{ total: number }>(
      `SELECT COUNT(DISTINCT projeto.id)::int AS total
       FROM projeto
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

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<ProjetoResumoDto>(
      `SELECT DISTINCT
         projeto.id,
         projeto.nome,
         projeto.codigo,
         projeto.cor,
         projeto.status
       FROM projeto
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
       LIMIT ${itensPorPagina} OFFSET ${deslocamento}`,
      parametros,
    );

    return { itens, total };
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
      setClauses.push('status = :status');
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
         status,
         inicio_data::text       AS "inicioData",
         previsao_fim_data::text AS "previsaoFimData",
         created_date            AS "createdDate"`,
      parametros,
    );
    return resultado[0];
  }

  /** Soft delete do projeto. */
  async excluir(dto: ProjetoExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
