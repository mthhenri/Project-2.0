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
  AtividadeRecuperarDto,
  AtividadeInternoAlterarDto,
  AtividadeAlteradaDto,
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
   * Verifica existência da demanda; o acesso via demanda_usuario só é exigido do
   * desenvolvedor (gestor tem acesso total a qualquer demanda, sem atribuição).
   */
  async criar(
    dto: AtividadeCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeCriadaDto>> {
    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: dto.demandaId });
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const executorId =
      usuarioAtivo.tipo === UsuarioTipoEnum.GESTOR
        ? (dto.usuarioId ?? usuarioAtivo.sub)
        : usuarioAtivo.sub;

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
        demandaId: dto.demandaId,
        usuarioId: usuarioAtivo.sub,
      });
      if (!temAcesso) {
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda informada');
      }
    }

    const atividadeCriada = await this.atividadeRepositorio.inserir({
      demandaId:     dto.demandaId,
      usuarioId:     executorId,
      nome:          dto.nome,
      descricao:     dto.descricao ?? null,
      status:        dto.status,
    });

    if (dto.tagIds && dto.tagIds.length > 0) {
      for (const tagId of dto.tagIds) {
        const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
        if (!tagEncontrada) {
          throw new ResourceNotFoundException(`Tag com id ${tagId}`);
        }
      }
      await this.atividadeRepositorio.alterarTags({ atividadeId: atividadeCriada.id, tagIds: dto.tagIds });
    }

    return {
      sucesso:  true,
      dados:    atividadeCriada,
      mensagem: 'Atividade criada com sucesso',
    };
  }

  /**
   * Lista atividades com paginação e filtros opcionais (executor, status,
   * demanda, busca textual e intervalo de data de criação).
   *
   * Controle de acesso por tipo de usuário:
   * - Gestor: vê as atividades de todos; pode opcionalmente filtrar por um
   *   executor específico via filtros.usuarioId.
   * - Desenvolvedor membro da demanda filtrada: vê todas as atividades dessa
   *   demanda.
   * - Desenvolvedor sem demandaId no filtro ou não-membro da demanda: vê
   *   somente as próprias atividades (usuarioId sobrescrito pelo id autenticado).
   */
  async listar(
    filtros: AtividadeListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<AtividadeResumoDto>>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    let filtrosEfetivos: AtividadeListarDto = filtros;
    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const eMembroDaDemanda =
        filtros.demandaId !== undefined &&
        (await this.atividadeRepositorio.validarAcessoDemanda({
          demandaId: filtros.demandaId,
          usuarioId: usuarioAtivo.sub,
        }));

      filtrosEfetivos = eMembroDaDemanda
        ? filtros
        : { ...filtros, usuarioId: usuarioAtivo.sub };
    }

    const { itens, total } = await this.atividadeRepositorio.listar(filtrosEfetivos);
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
    dto: AtividadeRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeRecuperadaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
        demandaId: atividadeEncontrada.demandaId,
        usuarioId: usuarioAtivo.sub,
      });
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
   * Altera campos da atividade.
   * Desenvolvedor só pode alterar atividades cuja autoria é sua (usuarioId) ou
   * onde está atribuído à demanda.
   */
  async alterar(
    dto: AtividadeInternoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeAlteradaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const eAutor = atividadeEncontrada.usuarioId === usuarioAtivo.sub;
      const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
        demandaId: atividadeEncontrada.demandaId,
        usuarioId: usuarioAtivo.sub,
      });

      if (!eAutor && !temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem permissão para alterar esta atividade',
        );
      }
    }

    if (dto.status !== undefined && dto.status !== atividadeEncontrada.status) {
      const possuiExecucaoAtiva = await this.atividadeRepositorio.possuiExecucaoAtiva({ id: dto.id });
      if (possuiExecucaoAtiva) {
        throw new BusinessException(
          'Não é possível alterar o status de uma atividade com execução em andamento',
        );
      }
    }

    const atividadeAlterada = await this.atividadeRepositorio.alterar({
      id:            dto.id,
      nome:          dto.nome,
      descricao:     dto.descricao,
      status:        dto.status,
    });

    return {
      sucesso:  true,
      dados:    atividadeAlterada,
      mensagem: 'Atividade alterada com sucesso',
    };
  }

  /** Realiza soft delete da atividade. Restrito a gestores. */
  async excluir(dto: AtividadeRecuperarDto): Promise<StandardResponse<void>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    await this.atividadeRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Atividade excluída com sucesso',
    };
  }

  /**
   * Sincroniza as tags de uma atividade com a lista enviada.
   * Desenvolvedor só pode alterar as tags de atividades cuja autoria é sua
   * (usuarioId) ou onde está atribuído à demanda. Gestor é sempre liberado.
   */
  async alterarTags(
    dto: AtividadeTagsAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadeTagsAtribuidasDto>> {
    const atividadeId = dto.id!;

    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: atividadeId });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const eAutor = atividadeEncontrada.usuarioId === usuarioAtivo.sub;
      const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
        demandaId: atividadeEncontrada.demandaId,
        usuarioId: usuarioAtivo.sub,
      });

      if (!eAutor && !temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem permissão para alterar esta atividade',
        );
      }
    }

    for (const tagId of dto.tagIds) {
      const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
      if (!tagEncontrada) {
        throw new ResourceNotFoundException(`Tag com id ${tagId}`);
      }
    }

    await this.atividadeRepositorio.alterarTags({ atividadeId, tagIds: dto.tagIds });

    const tagsAlteradas = await this.atividadeRepositorio.listarTags({ atividadeId });

    return {
      sucesso:  true,
      dados:    { atividadeId, tags: tagsAlteradas },
      mensagem: 'Tags da atividade alteradas com sucesso',
    };
  }

  /**
   * Lista as tags ativas de uma atividade.
   */
  async listarTags(
    dto: AtividadeRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<TagResumoDto[]>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
        demandaId: atividadeEncontrada.demandaId,
        usuarioId: usuarioAtivo.sub,
      });
      if (!temAcesso) {
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
      }
    }

    const tags = await this.atividadeRepositorio.listarTags({ atividadeId: dto.id });

    return {
      sucesso:  true,
      dados:    tags,
      mensagem: 'Tags da atividade listadas com sucesso',
    };
  }
}
