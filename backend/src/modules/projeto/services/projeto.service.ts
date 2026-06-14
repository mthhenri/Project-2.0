import { Injectable } from '@nestjs/common';
import { ProjetoRepository } from '../repositories/projeto.repository';
import {
  ProjetoCriarDto,
  ProjetoCriadoDto,
  ProjetoListarDto,
  ProjetoResumoDto,
  ProjetoRecuperadoDto,
  ProjetoAtualizarDto,
  ProjetoAtualizadoDto,
  UsuarioTipoEnum,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { PaginatedResult } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class ProjetoService {
  constructor(private readonly projetoRepositorio: ProjetoRepository) {}

  /** Cria novo projeto. Código duplicado lança BusinessException. Restrito a gestores. */
  async criar(dto: ProjetoCriarDto): Promise<StandardResponse<ProjetoCriadoDto>> {
    const codigoJaExiste = await this.projetoRepositorio.existeCodigo(dto.codigo);

    if (codigoJaExiste) {
      throw new BusinessException('Código de projeto já está em uso');
    }

    if (dto.inicioData && dto.previsaoFimData && dto.previsaoFimData <= dto.inicioData) {
      throw new BusinessException('A previsão de fim deve ser posterior à data de início');
    }

    const projetoCriado = await this.projetoRepositorio.inserir({
      nome:            dto.nome,
      codigo:          dto.codigo,
      cor:             dto.cor,
      status:          dto.status,
      inicioData:      dto.inicioData ? new Date(dto.inicioData) : null,
      previsaoFimData: dto.previsaoFimData ? new Date(dto.previsaoFimData) : null,
    });

    return {
      sucesso:  true,
      dados:    projetoCriado,
      mensagem: 'Projeto criado com sucesso',
    };
  }

  /**
   * Lista projetos conforme tipo do usuário:
   * - GESTOR: todos os projetos ativos
   * - DESENVOLVEDOR: apenas projetos com ao menos uma demanda atribuída a ele
   */
  async listar(
    filtros: ProjetoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<ProjetoResumoDto>>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    const { itens, total } =
      usuarioAtivo.tipo === UsuarioTipoEnum.GESTOR
        ? await this.projetoRepositorio.listarTodos(filtros)
        : await this.projetoRepositorio.listarPorUsuario(usuarioAtivo.sub, filtros);

    const totalPaginas = Math.ceil(total / itensPorPagina);

    return {
      sucesso: true,
      dados: {
        itens,
        totalItens:    total,
        paginaAtual:   pagina,
        itensPorPagina,
        totalPaginas,
      },
      mensagem: 'Projetos listados com sucesso',
    };
  }

  /**
   * Recupera projeto por ID.
   * Desenvolvedor sem demanda atribuída recebe ResourceNotFoundException
   * para não revelar a existência do projeto.
   */
  async recuperar(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ProjetoRecuperadoDto>> {
    const projetoEncontrado = await this.projetoRepositorio.buscarIdentificador(id);

    if (!projetoEncontrado) {
      throw new ResourceNotFoundException('Projeto');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const { itens } = await this.projetoRepositorio.listarPorUsuario(usuarioAtivo.sub, {});
      const temAcesso = itens.some((projeto) => projeto.id === id);

      if (!temAcesso) {
        throw new ResourceNotFoundException('Projeto');
      }
    }

    return {
      sucesso:  true,
      dados:    projetoEncontrado,
      mensagem: 'Projeto recuperado com sucesso',
    };
  }

  /** Atualiza dados do projeto. Código não pode ser alterado. Restrito a gestores. */
  async atualizar(
    id: number,
    dto: ProjetoAtualizarDto,
  ): Promise<StandardResponse<ProjetoAtualizadoDto>> {
    const projetoEncontrado = await this.projetoRepositorio.buscarIdentificador(id);

    if (!projetoEncontrado) {
      throw new ResourceNotFoundException('Projeto');
    }

    const inicioDataFinal      = dto.inicioData      ?? projetoEncontrado.inicioData;
    const previsaoFimDataFinal = dto.previsaoFimData ?? projetoEncontrado.previsaoFimData;

    if (inicioDataFinal && previsaoFimDataFinal && previsaoFimDataFinal <= inicioDataFinal) {
      throw new BusinessException('A previsão de fim deve ser posterior à data de início');
    }

    const projetoAtualizado = await this.projetoRepositorio.atualizar(id, {
      nome:            dto.nome,
      cor:             dto.cor,
      status:          dto.status,
      inicioData:      dto.inicioData      ? new Date(dto.inicioData)      : undefined,
      previsaoFimData: dto.previsaoFimData ? new Date(dto.previsaoFimData) : undefined,
    });

    return {
      sucesso:  true,
      dados:    projetoAtualizado,
      mensagem: 'Projeto atualizado com sucesso',
    };
  }

  /** Realiza soft delete do projeto. Restrito a gestores. */
  async excluir(id: number): Promise<StandardResponse<void>> {
    const projetoEncontrado = await this.projetoRepositorio.buscarIdentificador(id);

    if (!projetoEncontrado) {
      throw new ResourceNotFoundException('Projeto');
    }

    await this.projetoRepositorio.excluir(id);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Projeto excluído com sucesso',
    };
  }
}
