import { Injectable } from '@nestjs/common';
import { DemandaRepository } from '../repositories/demanda.repository';
import {
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaListarDto,
  DemandaResumoDto,
  DemandaRecuperadaDto,
  DemandaAtualizarDto,
  DemandaGrafoDto,
  DemandaArvoreItemDto,
  DemandaAncestralDto,
  DemandaConexaoCriarDto,
  DemandaConexaoCriadaDto,
  DemandaConexaoResumoDto,
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
  constructor(private readonly demandaRepositorio: DemandaRepository) {}

  /**
   * Cria nova demanda com auto-atribuição transacional do criador e de todos os gestores ativos.
   * Desenvolvedor só pode criar em projetos onde já tem acesso via demanda_usuario.
   */
  async criar(
    dto: DemandaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaCriadaDto>> {
    if (
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR
    ) {
      const temAcesso = await this.demandaRepositorio.usuarioTemAcessoProjeto(
        dto.projetoId,
        usuarioAtivo.sub,
      );

      if (!temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem acesso ao projeto informado',
        );
      }
    }

    if (dto.demandaPaiId !== undefined) {
      const demandaPaiEncontrada = await this.demandaRepositorio.buscarIdentificador(
        dto.demandaPaiId,
      );

      if (!demandaPaiEncontrada) {
        throw new ResourceNotFoundException('Demanda pai');
      }

      if (demandaPaiEncontrada.projetoId !== dto.projetoId) {
        throw new BusinessException(
          'A demanda pai deve pertencer ao mesmo projeto',
        );
      }
    }

    const gestorIds = await this.demandaRepositorio.buscarIdGestoresAtivos();

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
        ordemExibicao:    dto.ordemExibicao,
      },
      usuarioAtivo.sub,
      gestorIds,
    );

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

    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const { itens, total } = await this.demandaRepositorio.listar(filtros, usuarioId);
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
   * Recupera demanda por ID.
   * Desenvolvedor só pode recuperar demandas às quais está atribuído.
   */
  async recuperar(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaRecuperadaDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(id, usuarioId);

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    return {
      sucesso:  true,
      dados:    demandaEncontrada,
      mensagem: 'Demanda recuperada com sucesso',
    };
  }

  /**
   * Atualiza dados da demanda.
   * Desenvolvedor só pode atualizar demandas às quais está atribuído.
   */
  async atualizar(
    id: number,
    dto: DemandaAtualizarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaRecuperadaDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(id, usuarioId);

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    if (dto.demandaPaiId !== undefined) {
      const demandaPaiEncontrada = await this.demandaRepositorio.buscarIdentificador(
        dto.demandaPaiId,
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

    const demandaAtualizada = await this.demandaRepositorio.atualizar(id, {
      demandaPaiId:     dto.demandaPaiId,
      nome:             dto.nome,
      descricaoTecnica: dto.descricaoTecnica,
      descricaoCliente: dto.descricaoCliente,
      documentacao:     dto.documentacao,
      horasEstimadas:   dto.horasEstimadas,
      prioridade:       dto.prioridade,
      status:           dto.status,
      isEstrutural:     dto.isEstrutural,
      previsaoFimData:  dto.previsaoFimData ? new Date(dto.previsaoFimData) : undefined,
      ordemExibicao:    dto.ordemExibicao,
    });

    return {
      sucesso:  true,
      dados:    demandaAtualizada,
      mensagem: 'Demanda atualizada com sucesso',
    };
  }

  /**
   * Retorna a árvore de descendentes como estrutura aninhada.
   * Converte a lista plana do repositório em árvore recursiva.
   * Desenvolvedor só pode consultar demandas às quais está atribuído.
   */
  async recuperarArvore(
    demandaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaArvoreItemDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(demandaId, usuarioId);
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const descendentes = await this.demandaRepositorio.buscarDescendentes(demandaId);

    const mapa = new Map<number, DemandaArvoreItemDto>();
    for (const item of descendentes) {
      mapa.set(item.id, {
        id:             item.id,
        nome:           item.nome,
        status:         item.status,
        prioridade:     item.prioridade,
        isEstrutural:   item.isEstrutural,
        horasEstimadas: item.horasEstimadas,
        nivel:          item.nivel,
        filhos:         [],
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
    demandaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaAncestralDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(demandaId, usuarioId);
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const ancestrais = await this.demandaRepositorio.buscarAncestral(demandaId);

    return {
      sucesso:  true,
      dados:    ancestrais,
      mensagem: 'Ancestrais da demanda recuperados com sucesso',
    };
  }

  /**
   * Cria uma conexão entre demandas com prevenção de ciclos via CTE recursivo.
   * Verifica existência de origem e destino, auto-referência e duplicidade antes de inserir.
   */
  async criarConexao(
    demandaOrigemId: number,
    dto: DemandaConexaoCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaConexaoCriadaDto>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaOrigemEncontrada = await this.demandaRepositorio.buscarIdentificador(
      demandaOrigemId,
      usuarioId,
    );
    if (!demandaOrigemEncontrada) {
      throw new ResourceNotFoundException('Demanda origem');
    }

    const demandaDestinoEncontrada = await this.demandaRepositorio.buscarIdentificador(
      dto.demandaDestinoId,
    );
    if (!demandaDestinoEncontrada) {
      throw new ResourceNotFoundException('Demanda destino');
    }

    if (demandaOrigemId === dto.demandaDestinoId) {
      throw new BusinessException('A demanda origem e destino não podem ser a mesma');
    }

    const conexaoJaExiste = await this.demandaRepositorio.existeConexao(
      demandaOrigemId,
      dto.demandaDestinoId,
    );
    if (conexaoJaExiste) {
      throw new BusinessException('Já existe uma conexão ativa entre essas demandas neste sentido');
    }

    const criariaCiclo = await this.demandaRepositorio.verificarCriariaCiclo(
      demandaOrigemId,
      dto.demandaDestinoId,
    );
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
    demandaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaConexaoResumoDto[]>> {
    const usuarioId =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(demandaId, usuarioId);
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const conexoes = await this.demandaRepositorio.listarConexoes(demandaId);

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
    demandaId: number,
    conexaoId: number,
  ): Promise<StandardResponse<void>> {
    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(demandaId);
    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    const conexaoPertence = await this.demandaRepositorio.conexaoPertenceADemanda(
      conexaoId,
      demandaId,
    );
    if (!conexaoPertence) {
      throw new ResourceNotFoundException('Conexão');
    }

    await this.demandaRepositorio.excluirConexao(conexaoId);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Conexão removida com sucesso',
    };
  }

  /** Realiza soft delete da demanda. Restrito a gestores. */
  async excluir(id: number): Promise<StandardResponse<void>> {
    const demandaEncontrada = await this.demandaRepositorio.buscarIdentificador(id);

    if (!demandaEncontrada) {
      throw new ResourceNotFoundException('Demanda');
    }

    await this.demandaRepositorio.excluir(id);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Demanda excluída com sucesso',
    };
  }

  /**
   * Retorna o grafo de demandas de um projeto (nós e arestas para D3).
   * Desenvolvedor só vê o grafo se tiver acesso ao projeto.
   * Arestas de conexão explícita serão adicionadas na task 12.
   */
  async recuperarGrafo(
    projetoId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<DemandaGrafoDto>> {
    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const temAcesso = await this.demandaRepositorio.usuarioTemAcessoProjeto(
        projetoId,
        usuarioAtivo.sub,
      );

      if (!temAcesso) {
        throw new UnauthorizedAccessException(
          'Desenvolvedor não tem acesso ao projeto informado',
        );
      }
    }

    const grafo = await this.demandaRepositorio.recuperarGrafo(projetoId);

    return {
      sucesso:  true,
      dados:    grafo,
      mensagem: 'Grafo de demandas recuperado com sucesso',
    };
  }
}
