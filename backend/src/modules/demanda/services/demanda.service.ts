import { Injectable } from '@nestjs/common';
import { DemandaRepository } from '../repositories/demanda.repository';
import { TagRepository } from '../../tag/repositories/tag.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import {
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaListarDto,
  DemandaAtribuidaDto,
  DemandaResumoDto,
  DemandaRecuperadaDto,
  DemandaRecuperarDto,
  DemandaInternoAlterarDto,
  DemandaGrafoDto,
  DemandaGrafoRecuperarDto,
  DemandaArvoreItemDto,
  DemandaAncestralDto,
  DemandaConexaoCriarDto,
  DemandaConexaoCriadaDto,
  DemandaConexaoResumoDto,
  DemandaConexaoExcluirDto,
  DemandaTagsAtribuirDto,
  DemandaTagsAtribuidasDto,
  DemandaUsuarioAtribuirDto,
  DemandaUsuarioAtribuidoDto,
  DemandaMembroDto,
  DemandaMembroRemoverDto,
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
export class DemandaService {
  constructor(
    private readonly demandaRepositorio: DemandaRepository,
    private readonly tagRepositorio: TagRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {}

  /**
   * Cria nova demanda com atribuição transacional apenas do criador desenvolvedor
   * (e dos membros explicitamente selecionados na criação). O gestor tem acesso total
   * a qualquer demanda/projeto por ser gestor — não é atribuído via demanda_usuario.
   * Desenvolvedor só pode criar em projetos onde já tem acesso via demanda_usuario.
   */
  async criar(
    dto: DemandaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaCriadaDto>> {
    if (
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR &&
      dto.demandaPaiId === undefined
    ) {
      throw new UnauthorizedAccessException(
        'Desenvolvedor só pode criar sub-demandas (é obrigatório informar a demanda pai)',
      );
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.demandaRepositorio.validarAcessoProjeto({
        projetoId: dto.projetoId,
        usuarioId: usuarioAtivo.sub,
      });

      if (!temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem acesso ao projeto informado',
        );
      }
    }

    if (dto.demandaPaiId !== undefined) {
      const demandaPaiEncontrada = await this.demandaRepositorio.recuperar(
        { id: dto.demandaPaiId },
      );

      if (!demandaPaiEncontrada) {
        throw new ResourceNotFoundException('Demanda pai');
      }

      if (demandaPaiEncontrada.projetoId !== dto.projetoId) {
        throw new BusinessException(
          'A demanda pai deve pertencer ao mesmo projeto',
        );
      }

      if (!demandaPaiEncontrada.isEstrutural) {
        throw new BusinessException(
          'Apenas demandas estruturais podem ter sub-demandas',
        );
      }
    }

    const membroIds = [...new Set(dto.usuarioIds ?? [])];
    if (membroIds.length > 0) {
      if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
        const apenasProprio = membroIds.every((membroId) => membroId === usuarioAtivo.sub);
        if (!apenasProprio) {
          throw new UnauthorizedAccessException(
            'Desenvolvedor não pode atribuir outros membros na criação',
          );
        }
      }

      for (const membroId of membroIds) {
        const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: membroId });
        if (!usuarioEncontrado) {
          throw new ResourceNotFoundException(`Usuário com id ${membroId}`);
        }
      }
    }

    if (dto.tagIds && dto.tagIds.length > 0 && usuarioAtivo.tipo !== UsuarioTipoEnum.GESTOR) {
      throw new UnauthorizedAccessException('Apenas gestores podem atribuir tags às demandas');
    }

    const usuarioIds = [
      ...new Set([
        ...(usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? [usuarioAtivo.sub] : []),
        ...membroIds,
      ]),
    ];

    const demandaCriada = await this.demandaRepositorio.inserirComAtribuicao(
      {
        projetoId:        dto.projetoId,
        demandaPaiId:     dto.demandaPaiId ?? null,
        nome:             dto.nome,
        descricaoTecnica: dto.descricaoTecnica ?? null,
        descricaoCliente: dto.descricaoCliente ?? null,
        documentacao:     dto.documentacao ?? null,
        horasEstimadas:   dto.horasEstimadas,
        prioridade:       dto.prioridade,
        status:           dto.status,
        isEstrutural:     dto.isEstrutural,
        previsaoFimData:  dto.previsaoFimData ? new Date(dto.previsaoFimData) : null,
      },
      { usuarioIds },
    );

    if (dto.tagIds && dto.tagIds.length > 0) {
      for (const tagId of dto.tagIds) {
        const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
        if (!tagEncontrada) {
          throw new ResourceNotFoundException(`Tag com id ${tagId}`);
        }
      }
      await this.demandaRepositorio.atribuirTagsDemanda({ demandaId: demandaCriada.id, tagIds: dto.tagIds });
    }

    return {
      sucesso:  true,
      dados:    demandaCriada,
      mensagem: 'Demanda criada com sucesso',
    };
  }

  /**
   * Lista demandas de um projeto com paginação.
   * Gestor vê todas as demandas do projeto; desenvolvedor vê apenas as suas.
   */
  async listar(
    filtros: DemandaListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<DemandaResumoDto>>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    const restricao =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR
        ? { usuarioId: usuarioAtivo.sub }
        : undefined;

    const { itens, total } = await this.demandaRepositorio.listar(filtros, restricao);
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
      mensagem: 'Demandas listadas com sucesso',
    };
  }

  /**
   * Lista as demandas planejadas/pendentes para seleção na criação de atividades.
   * Desenvolvedor recebe apenas as demandas às quais está atribuído (demanda_usuario);
   * gestor recebe todas as demandas não-concluídas de todos os projetos (acesso total).
   */
  async listarAtribuidas(
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaAtribuidaDto[]>> {
    const demandas = await this.demandaRepositorio.listarAtribuidas({
      usuarioId: usuarioAtivo.sub,
      apenasAtribuidas: usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR,
    });

    return {
      sucesso: true,
      dados: demandas,
      mensagem: 'Demandas atribuídas listadas com sucesso',
    };
  }

  /**
   * Recupera demanda por ID.
   * Desenvolvedor pode visualizar qualquer demanda de um projeto ao qual tem acesso;
   * a flag `podeEditar` indica se ele pode editá-la (só quando é membro da demanda).
   */
  async recuperar(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaRecuperadaDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    demandaEncontrada.podeEditar =
      usuarioAtivo.tipo !== UsuarioTipoEnum.DESENVOLVEDOR ||
      (await this.demandaRepositorio.validarMembro({ demandaId: dto.id, usuarioId: usuarioAtivo.sub }));

    return {
      sucesso:  true,
      dados:    demandaEncontrada,
      mensagem: 'Demanda recuperada com sucesso',
    };
  }

  /**
   * Altera dados da demanda.
   * Desenvolvedor só pode alterar demandas das quais é membro (demanda_usuario);
   * a descrição do cliente permanece exclusiva do gestor.
   */
  async alterar(
    dto: DemandaInternoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaRecuperadaDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const eMembro = await this.demandaRepositorio.validarMembro({
        demandaId: dto.id,
        usuarioId: usuarioAtivo.sub,
      });
      if (!eMembro) {
        throw new UnauthorizedAccessException(
          'Você só pode editar demandas das quais é membro',
        );
      }
    }

    if (
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR &&
      dto.descricaoCliente !== undefined
    ) {
      throw new UnauthorizedAccessException(
        'Apenas gestores podem alterar a descrição do cliente',
      );
    }

    if (dto.demandaPaiId !== undefined) {
      const demandaPaiEncontrada = await this.demandaRepositorio.recuperar(
        { id: dto.demandaPaiId },
      );

      if (!demandaPaiEncontrada) {
        throw new ResourceNotFoundException('Demanda pai');
      }

      if (demandaPaiEncontrada.projetoId !== demandaEncontrada.projetoId) {
        throw new BusinessException(
          'A demanda pai deve pertencer ao mesmo projeto',
        );
      }
    }

    const demandaAlterada = await this.demandaRepositorio.alterar({
      id:               dto.id,
      demandaPaiId:     dto.demandaPaiId,
      nome:             dto.nome,
      descricaoTecnica: dto.descricaoTecnica,
      descricaoCliente: dto.descricaoCliente,
      documentacao:     dto.documentacao,
      horasEstimadas:   dto.horasEstimadas,
      prioridade:       dto.prioridade,
      status:           dto.status,
      isEstrutural:     dto.isEstrutural,
      previsaoFimData:  dto.previsaoFimData,
    });

    return {
      sucesso:  true,
      dados:    demandaAlterada,
      mensagem: 'Demanda alterada com sucesso',
    };
  }

  /**
   * Retorna a árvore de descendentes como estrutura aninhada.
   * Converte a lista plana do repositório em árvore recursiva.
   * Desenvolvedor só pode consultar demandas às quais está atribuído.
   */
  async recuperarArvore(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaArvoreItemDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const descendentes = await this.demandaRepositorio.listarDescendentes({ demandaId: dto.id });

    const mapa = new Map<number, DemandaArvoreItemDto>();
    for (const item of descendentes) {
      mapa.set(item.id, {
        id:                  item.id,
        nome:                item.nome,
        status:              item.status,
        prioridade:          item.prioridade,
        isEstrutural:        item.isEstrutural,
        horasEstimadas:      item.horasEstimadas,
        temDescricaoTecnica: item.temDescricaoTecnica,
        temDescricaoCliente: item.temDescricaoCliente,
        temDocumentacao:     item.temDocumentacao,
        tags:                item.tags,
        nivel:               item.nivel,
        filhos:              [],
      });
    }

    let raiz: DemandaArvoreItemDto | null = null;
    for (const item of descendentes) {
      const no = mapa.get(item.id)!;
      if (item.demandaPaiId === null || !mapa.has(item.demandaPaiId)) {
        raiz = no;
      } else {
        mapa.get(item.demandaPaiId)!.filhos.push(no);
      }
    }

    return {
      sucesso:  true,
      dados:    raiz!,
      mensagem: 'Árvore de demanda recuperada com sucesso',
    };
  }

  /**
   * Retorna a lista de ancestrais em ordem do pai até a raiz (breadcrumb).
   * Desenvolvedor só pode consultar demandas às quais está atribuído.
   */
  async recuperarAncestral(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaAncestralDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const ancestrais = await this.demandaRepositorio.listarAncestral({ demandaId: dto.id });

    return {
      sucesso:  true,
      dados:    ancestrais,
      mensagem: 'Ancestrais da demanda recuperados com sucesso',
    };
  }

  /**
   * Cria uma conexão entre demandas com prevenção de ciclos via CTE recursivo.
   * Verifica existência de origem e destino, auto-referência e duplicidade antes de inserir.
   * Restrito a gestores.
   */
  async criarConexao(
    dto: DemandaConexaoCriarDto,
  ): Promise<StandardResponse<DemandaConexaoCriadaDto>> {
    const demandaOrigemId = dto.demandaOrigemId!;

    const demandaOrigemEncontrada = await this.demandaRepositorio.recuperar(
      { id: demandaOrigemId },
    );
    if (!demandaOrigemEncontrada) {
      throw new ResourceNotFoundException('Demanda origem');
    }

    const demandaDestinoEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.demandaDestinoId },
    );
    if (!demandaDestinoEncontrada) {
      throw new ResourceNotFoundException('Demanda destino');
    }

    if (demandaOrigemId === dto.demandaDestinoId) {
      throw new BusinessException('A demanda origem e destino não podem ser a mesma');
    }

    const conexaoJaExiste = await this.demandaRepositorio.validarConexao({
      demandaOrigemId,
      demandaDestinoId: dto.demandaDestinoId,
    });
    if (conexaoJaExiste) {
      throw new BusinessException('Já existe uma conexão ativa entre essas demandas neste sentido');
    }

    const criariaCiclo = await this.demandaRepositorio.verificarCriariaCiclo({
      demandaOrigemId,
      demandaDestinoId: dto.demandaDestinoId,
    });
    if (criariaCiclo) {
      throw new BusinessException('Essa conexão criaria um ciclo no grafo de demandas');
    }

    const conexaoCriada = await this.demandaRepositorio.inserirConexao({
      demandaOrigemId,
      demandaDestinoId: dto.demandaDestinoId,
      ehBidirecional:   dto.ehBidirecional,
    });

    return {
      sucesso:  true,
      dados:    conexaoCriada,
      mensagem: 'Conexão criada com sucesso',
    };
  }

  /**
   * Lista todas as conexões de uma demanda (saída, entrada bidirecional).
   * Desenvolvedor só pode listar conexões de demandas às quais está atribuído.
   */
  async listarConexoes(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaConexaoResumoDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const conexoes = await this.demandaRepositorio.listarConexoes({ demandaId: dto.id });

    return {
      sucesso:  true,
      dados:    conexoes,
      mensagem: 'Conexões listadas com sucesso',
    };
  }

  /**
   * Remove uma conexão via soft delete. Verifica que a conexão pertence à demanda.
   * Restrito a gestores.
   */
  async excluirConexao(
    dto: DemandaConexaoExcluirDto,
  ): Promise<StandardResponse<void>> {
    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: dto.demandaId });
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const conexaoPertence = await this.demandaRepositorio.validarConexaoDemanda({
      conexaoId: dto.conexaoId,
      demandaId: dto.demandaId,
    });
    if (!conexaoPertence) {
      throw new ResourceNotFoundException('Conexão');
    }

    await this.demandaRepositorio.excluirConexao({ demandaId: dto.demandaId, conexaoId: dto.conexaoId });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Conexão removida com sucesso',
    };
  }

  /** Realiza soft delete da demanda. Restrito a gestores. */
  async excluir(dto: DemandaRecuperarDto): Promise<StandardResponse<void>> {
    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: dto.id });

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    await this.demandaRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Demanda excluída com sucesso',
    };
  }

  /**
   * Retorna o grafo de demandas de um projeto (nós e arestas para D3).
   * Desenvolvedor só vê o grafo se tiver acesso ao projeto.
   */
  async recuperarGrafo(
    dto: DemandaGrafoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaGrafoDto>> {
    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.demandaRepositorio.validarAcessoProjeto({
        projetoId: dto.projetoId,
        usuarioId: usuarioAtivo.sub,
      });

      if (!temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem acesso ao projeto informado',
        );
      }
    }

    const grafo = await this.demandaRepositorio.recuperarGrafo({ projetoId: dto.projetoId });

    return {
      sucesso:  true,
      dados:    grafo,
      mensagem: 'Grafo de demandas recuperado com sucesso',
    };
  }

  /**
   * Sincroniza as tags de uma demanda com a lista enviada.
   * Remove as que saíram, insere as novas, mantém as que continuam.
   * Gestor sempre pode; desenvolvedor só nas demandas das quais é membro.
   */
  async alterarTagsDemanda(
    dto: DemandaTagsAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaTagsAtribuidasDto>> {
    const demandaId = dto.demandaId!;

    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: demandaId });
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    if (usuarioAtivo.tipo !== UsuarioTipoEnum.GESTOR) {
      throw new UnauthorizedAccessException(
        'Apenas gestores podem atribuir tags às demandas',
      );
    }

    for (const tagId of dto.tagIds) {
      const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
      if (!tagEncontrada) {
        throw new ResourceNotFoundException(`Tag com id ${tagId}`);
      }
    }

    await this.demandaRepositorio.atribuirTagsDemanda({ demandaId, tagIds: dto.tagIds });

    const tagsAlteradas = await this.demandaRepositorio.listarTagsDemanda({ demandaId });

    return {
      sucesso:  true,
      dados:    { demandaId, tags: tagsAlteradas },
      mensagem: 'Tags da demanda alteradas com sucesso',
    };
  }

  /**
   * Lista as tags ativas de uma demanda.
   * Desenvolvedor só pode consultar demandas às quais está atribuído.
   */
  async listarTagsDemanda(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<TagResumoDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const tags = await this.demandaRepositorio.listarTagsDemanda({ demandaId: dto.id });

    return {
      sucesso:  true,
      dados:    tags,
      mensagem: 'Tags da demanda listadas com sucesso',
    };
  }

  /**
   * Lista os membros ativos de uma demanda.
   * Desenvolvedor só pode consultar demandas às quais está atribuído.
   */
  async listarMembros(
    dto: DemandaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaMembroDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.recuperar(
      { id: dto.id },
      usuarioId !== undefined ? { usuarioId } : undefined,
    );
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const membros = await this.demandaRepositorio.listarMembrosDemanda({ demandaId: dto.id });

    return {
      sucesso:  true,
      dados:    membros,
      mensagem: 'Membros da demanda listados com sucesso',
    };
  }

  /**
   * Atribui um usuário à demanda. Impede duplicidade.
   * Gestor atribui qualquer usuário; desenvolvedor só pode incluir a si mesmo,
   * desde que tenha acesso ao projeto da demanda.
   */
  async atribuirMembro(
    dto: DemandaUsuarioAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaUsuarioAtribuidoDto>> {
    const demandaId = dto.demandaId!;

    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: demandaId });
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      if (dto.usuarioId !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor só pode incluir a si mesmo como membro',
        );
      }

      const temAcesso = await this.demandaRepositorio.validarAcessoProjeto({
        projetoId: demandaEncontrada.projetoId,
        usuarioId: usuarioAtivo.sub,
      });
      if (!temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem acesso ao projeto desta demanda',
        );
      }
    }

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: dto.usuarioId });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const jaAtribuido = await this.demandaRepositorio.validarMembro({
      demandaId,
      usuarioId: dto.usuarioId,
    });
    if (jaAtribuido) {
      throw new BusinessException('Usuário já está atribuído a esta demanda');
    }

    await this.demandaRepositorio.atribuirMembroDemanda({
      demandaId,
      usuarioId: dto.usuarioId,
    });

    return {
      sucesso: true,
      dados: {
        demandaId,
        usuarioId:   usuarioEncontrado.id,
        nomeUsuario: usuarioEncontrado.nomeCompleto,
        login:       usuarioEncontrado.login,
        tipo:        usuarioEncontrado.tipo,
      },
      mensagem: 'Membro atribuído à demanda com sucesso',
    };
  }

  /**
   * Remove um membro da demanda via soft delete. Impede remoção do último membro.
   * Gestor remove qualquer membro; desenvolvedor só pode remover a si mesmo.
   */
  async removerMembro(
    dto: DemandaMembroRemoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<void>> {
    const { demandaId, usuarioId } = dto;

    const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: demandaId });
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    if (
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR &&
      usuarioId !== usuarioAtivo.sub
    ) {
      throw new UnauthorizedAccessException(
        'Desenvolvedor só pode remover a si mesmo como membro',
      );
    }

    const estaAtribuido = await this.demandaRepositorio.validarMembro({ demandaId, usuarioId });
    if (!estaAtribuido) {
      throw new ResourceNotFoundException('Membro');
    }

    const totalMembros = await this.demandaRepositorio.contarMembrosDemanda({ demandaId });
    if (totalMembros <= 1) {
      throw new BusinessException('Não é possível remover o último membro da demanda');
    }

    await this.demandaRepositorio.removerMembroDemanda({ demandaId, usuarioId });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Membro removido da demanda com sucesso',
    };
  }
}
