import { Injectable } from '@nestjs/common';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { TagRepository } from '../../tag/repositories/tag.repository';
import {
  AtividadeCriarDto,
  AtividadeCriadaDto,
  AtividadeListarDto,
  AtividadeResumoDto,
  AtividadeRecuperadaDto,
  AtividadeAtualizarDto,
  AtividadeTagsAtribuirDto,
  AtividadeTagsAtribuidasDto,
  TagResumoDto,
  UsuarioTipoEnum,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { PaginatedResult } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class AtividadeService {
  constructor(
    private readonly atividadeRepositorio: AtividadeRepository,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly tagRepositorio: TagRepository,
  ) {}

  /**
   * Cria nova atividade vinculada à demanda.
   * O usuário autenticado torna-se o executor principal.
   * Verifica existência da demanda e acesso do usuário via demanda_usuario.
   */
  async criar(
    dto: AtividadeCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeCriadaDto>> {
    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(dto.demandaId);
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
      dto.demandaId,
      usuarioAtivo.sub,
    );
    if (!temAcesso) {
      throw new UnauthorizedAccessException('Usuário não tem acesso à demanda informada');
    }

    const atividadeCriada = await this.atividadeRepositorio.inserir({
      demandaId:     dto.demandaId,
      usuarioId:     usuarioAtivo.sub,
      nome:          dto.nome,
      descricao:     dto.descricao ?? null,
      status:        dto.status,
      ordemExibicao: dto.ordemExibicao,
    });

    return {
      sucesso:  true,
      dados:    atividadeCriada,
      mensagem: 'Atividade criada com sucesso',
    };
  }

  /**
   * Lista atividades de uma demanda com paginação e filtro opcional de status.
   */
  async listar(
    filtros: AtividadeListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<AtividadeResumoDto>>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
        filtros.demandaId,
        usuarioAtivo.sub,
      );
      if (!temAcesso) {
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda informada');
      }
    }

    const { itens, total } = await this.atividadeRepositorio.listar(filtros);
    const totalPaginas     = Math.ceil(total / itensPorPagina);

    return {
      sucesso: true,
      dados: {
        itens,
        totalItens:    total,
        paginaAtual:   pagina,
        itensPorPagina,
        totalPaginas,
      },
      mensagem: 'Atividades listadas com sucesso',
    };
  }

  /**
   * Recupera atividade por ID.
   * Desenvolvedor precisa estar atribuído à demanda da atividade para acessá-la.
   */
  async recuperar(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeRecuperadaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(id);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
        atividadeEncontrada.demandaId,
        usuarioAtivo.sub,
      );
      if (!temAcesso) {
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
      }
    }

    return {
      sucesso:  true,
      dados:    atividadeEncontrada,
      mensagem: 'Atividade recuperada com sucesso',
    };
  }

  /**
   * Atualiza campos da atividade.
   * Desenvolvedor só pode atualizar atividades cuja autoria é sua (usuarioId) ou
   * onde está atribuído à demanda.
   */
  async atualizar(
    id: number,
    dto: AtividadeAtualizarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeRecuperadaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(id);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const eAutor = atividadeEncontrada.usuarioId === usuarioAtivo.sub;
      const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
        atividadeEncontrada.demandaId,
        usuarioAtivo.sub,
      );

      if (!eAutor && !temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem permissão para atualizar esta atividade',
        );
      }
    }

    const atividadeAtualizada = await this.atividadeRepositorio.atualizar(id, {
      nome:          dto.nome,
      descricao:     dto.descricao,
      status:        dto.status,
      ordemExibicao: dto.ordemExibicao,
    });

    return {
      sucesso:  true,
      dados:    atividadeAtualizada,
      mensagem: 'Atividade atualizada com sucesso',
    };
  }

  /** Realiza soft delete da atividade. Restrito a gestores. */
  async excluir(id: number): Promise<StandardResponse<void>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(id);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    await this.atividadeRepositorio.excluir(id);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Atividade excluída com sucesso',
    };
  }

  /**
   * Sincroniza as tags de uma atividade com a lista enviada.
   * Restrito a gestores.
   */
  async atualizarTags(
    id: number,
    dto: AtividadeTagsAtribuirDto,
  ): Promise<StandardResponse<AtividadeTagsAtribuidasDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(id);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    for (const tagId of dto.tagIds) {
      const tagEncontrada = await this.tagRepositorio.buscarIdentificador(tagId);
      if (!tagEncontrada) {
        throw new ResourceNotFoundException(`Tag com id ${tagId}`);
      }
    }

    await this.atividadeRepositorio.atualizarTags(id, dto.tagIds);

    const tagsAtualizadas = await this.atividadeRepositorio.listarTags(id);

    return {
      sucesso:  true,
      dados:    { atividadeId: id, tags: tagsAtualizadas },
      mensagem: 'Tags da atividade atualizadas com sucesso',
    };
  }

  /**
   * Lista as tags ativas de uma atividade.
   */
  async listarTags(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<TagResumoDto[]>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(id);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
        atividadeEncontrada.demandaId,
        usuarioAtivo.sub,
      );
      if (!temAcesso) {
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
      }
    }

    const tags = await this.atividadeRepositorio.listarTags(id);

    return {
      sucesso:  true,
      dados:    tags,
      mensagem: 'Tags da atividade listadas com sucesso',
    };
  }
}
