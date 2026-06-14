import { Injectable } from '@nestjs/common';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import {
  ExecucaoIniciarDto,
  ExecucaoIniciadaDto,
  ExecucaoEncerrarDto,
  ExecucaoEncerradaDto,
  ExecucaoAlteradaDto,
  ExecucaoListarDto,
  ExecucaoResumoDto,
  ExecucaoAlterarDto,
  UsuarioTipoEnum,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { PaginatedResult } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class ExecucaoService {
  constructor(
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly atividadeRepositorio: AtividadeRepository,
  ) {}

  /**
   * Inicia uma nova execução para o usuário autenticado na atividade informada.
   * Valida existência da atividade, acesso via demanda_usuario e ausência de execução ativa.
   */
  async iniciar(
    dto: ExecucaoIniciarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoIniciadaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.buscarIdentificador(dto.atividadeId);
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    const temAcesso = await this.atividadeRepositorio.usuarioTemAcessoDemanda(
      atividadeEncontrada.demandaId,
      usuarioAtivo.sub,
    );
    if (!temAcesso) {
      throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
    }

    const execucaoAtiva = await this.execucaoRepositorio.buscarExecucaoAtiva(usuarioAtivo.sub);
    if (execucaoAtiva) {
      throw new BusinessException('Você já tem uma execução em andamento. Encerre-a antes de iniciar outra');
    }

    const execucaoIniciada = await this.execucaoRepositorio.inserir({
      atividadeId: dto.atividadeId,
      descricao:   dto.descricao,
      inicioData:  new Date(),
    });

    return {
      sucesso:  true,
      dados:    execucaoIniciada,
      mensagem: 'Execução iniciada com sucesso',
    };
  }

  /**
   * Encerra uma execução em andamento.
   * Desenvolvedor só pode encerrar as próprias; gestor pode encerrar qualquer uma.
   */
  async encerrar(
    id: number,
    dto: ExecucaoEncerrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoEncerradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.buscarIdentificador(id);
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (execucaoEncontrada.fimData !== null) {
      throw new BusinessException('Esta execução já foi encerrada');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.buscarUsuarioExecucao(id);
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode encerrar execução de outro usuário');
      }
    }

    const execucaoEncerrada = await this.execucaoRepositorio.encerrar(id, new Date(), dto.descricao);

    return {
      sucesso:  true,
      dados:    execucaoEncerrada,
      mensagem: 'Execução encerrada com sucesso',
    };
  }

  /**
   * Lista execuções com filtros opcionais.
   * Desenvolvedor vê apenas as próprias; gestor pode filtrar por qualquer usuário ou ver todas.
   */
  async listar(
    filtros: ExecucaoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<ExecucaoResumoDto>>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    const usuarioIdRestricao =
      usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? usuarioAtivo.sub : undefined;

    const { itens, total } = await this.execucaoRepositorio.listar(filtros, usuarioIdRestricao);
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
      mensagem: 'Execuções listadas com sucesso',
    };
  }

  /**
   * Recupera execução por ID.
   * Desenvolvedor só pode acessar as próprias.
   */
  async recuperar(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoEncerradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.buscarIdentificador(id);
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.buscarUsuarioExecucao(id);
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode acessar execução de outro usuário');
      }
    }

    return {
      sucesso:  true,
      dados:    execucaoEncontrada,
      mensagem: 'Execução recuperada com sucesso',
    };
  }

  /**
   * Altera a descrição de uma execução.
   * Desenvolvedor só pode editar as próprias; gestor pode editar qualquer uma.
   */
  async alterar(
    id: number,
    dto: ExecucaoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoAlteradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.buscarIdentificador(id);
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.buscarUsuarioExecucao(id);
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode editar execução de outro usuário');
      }
    }

    const execucaoAlterada = await this.execucaoRepositorio.alterar(id, dto.descricao);

    return {
      sucesso:  true,
      dados:    execucaoAlterada,
      mensagem: 'Execução alterada com sucesso',
    };
  }

  /** Realiza soft delete da execução. Restrito a gestores. */
  async excluir(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<void>> {
    const execucaoEncontrada = await this.execucaoRepositorio.buscarIdentificador(id);
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    await this.execucaoRepositorio.excluir(id);

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Execução excluída com sucesso',
    };
  }
}
