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
  ExecucaoAtivaDto,
  ExecucaoRegistrarDto,
  ExecucaoRegistradaDto,
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
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.atividadeId });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
      demandaId: atividadeEncontrada.demandaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!temAcesso) {
      throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
    }

    const execucaoAtiva = await this.execucaoRepositorio.recuperarAtiva({ usuarioId: usuarioAtivo.sub });
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
   * Registra uma execução já encerrada (início e fim definidos) na atividade informada.
   * Restrito a gestor (via @GestorOnly no controller). O usuário da execução é sempre
   * o dono da atividade. Valida existência da atividade, coerência das datas e ausência
   * de sobreposição com outras execuções do mesmo usuário.
   */
  async registrar(
    dto: ExecucaoRegistrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoRegistradaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.atividadeId });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    const inicioData = new Date(dto.inicioData);
    const fimData    = new Date(dto.fimData);
    const agora      = new Date();

    if (inicioData > agora) {
      throw new BusinessException('A data de início não pode estar no futuro');
    }
    if (fimData > agora) {
      throw new BusinessException('A data de fim não pode estar no futuro');
    }
    if (fimData <= inicioData) {
      throw new BusinessException('A data de fim deve ser posterior à data de início');
    }

    const haSobreposicao = await this.execucaoRepositorio.validarSobreposicao({
      usuarioId: atividadeEncontrada.usuarioId,
      inicioData,
      fimData,
    });
    if (haSobreposicao) {
      throw new BusinessException('Já existe uma execução deste usuário que se sobrepõe a este período');
    }

    const execucaoRegistrada = await this.execucaoRepositorio.registrar({
      atividadeId: dto.atividadeId,
      descricao:   dto.descricao,
      inicioData,
      fimData,
    });

    return {
      sucesso:  true,
      dados:    execucaoRegistrada,
      mensagem: 'Execução registrada com sucesso',
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
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (execucaoEncontrada.fimData !== null) {
      throw new BusinessException('Esta execução já foi encerrada');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: id });
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode encerrar execução de outro usuário');
      }
    }

    const execucaoEncerrada = await this.execucaoRepositorio.encerrar({ id, fimData: new Date(), descricao: dto.descricao });

    return {
      sucesso:  true,
      dados:    execucaoEncerrada,
      mensagem: 'Execução encerrada com sucesso',
    };
  }

  /**
   * Recupera a execução ativa (sem fim_data) do usuário autenticado, ou null.
   * Usada para alternar o estado play/pause na listagem de atividades.
   */
  async recuperarAtiva(
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoAtivaDto | null>> {
    const execucaoAtiva = await this.execucaoRepositorio.recuperarAtiva({ usuarioId: usuarioAtivo.sub });

    return {
      sucesso:  true,
      dados:    execucaoAtiva,
      mensagem: execucaoAtiva ? 'Execução ativa recuperada com sucesso' : 'Nenhuma execução ativa',
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
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: id });
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
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: id });
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode editar execução de outro usuário');
      }
    }

    const inicioData =
      dto.inicioData !== undefined ? new Date(dto.inicioData) : execucaoEncontrada.inicioData;
    const fimData =
      dto.fimData === undefined
        ? execucaoEncontrada.fimData
        : dto.fimData === null
          ? null
          : new Date(dto.fimData);

    const agora = new Date();
    if (inicioData > agora) {
      throw new BusinessException('A data de início não pode estar no futuro');
    }
    if (fimData !== null) {
      if (fimData > agora) {
        throw new BusinessException('A data de fim não pode estar no futuro');
      }
      if (fimData <= inicioData) {
        throw new BusinessException('A data de fim deve ser posterior à data de início');
      }
    }

    const execucaoAlterada = await this.execucaoRepositorio.alterar({
      id,
      descricao: dto.descricao,
      inicioData,
      fimData,
    });

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
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    await this.execucaoRepositorio.excluir({ id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Execução excluída com sucesso',
    };
  }
}
