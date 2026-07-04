import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { ConfigService } from '../../../config/config.service';
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
  ExecucaoRecuperarDto,
  ExecucaoAtivaDto,
  ExecucaoRegistrarDto,
  ExecucaoRegistradaDto,
  TipoUsuarioEnum,
  TipoAtividadeStatusEnum,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class ExecucaoService implements OnModuleInit {
  /** Status em que uma execução pode ser iniciada. */
  private static readonly STATUS_EXECUTAVEL: TipoAtividadeStatusEnum[] = [
    TipoAtividadeStatusEnum.PLANEJADA,
    TipoAtividadeStatusEnum.DESENVOLVENDO,
  ];

  private readonly logger = new Logger(ExecucaoService.name);

  constructor(
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly atividadeRepositorio: AtividadeRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registra dinamicamente o cron de auto-stop na virada do dia. O fuso é resolvido
   * do ConfigService (APP_TIMEZONE) — feito aqui, e não via decorator @Cron, porque o
   * decorator é avaliado antes da injeção de dependência e não teria acesso ao ConfigService.
   */
  onModuleInit(): void {
    const fusoHorario = this.configService.obter().aplicacao.fusoHorario;
    const job = new CronJob('59 59 23 * * *', () => this.encerrarExecucoesAbertas(), null, true, fusoHorario);
    this.schedulerRegistry.addCronJob('execucao-auto-stop-virada-dia', job);
  }

  /**
   * Encerra todas as execuções abertas do sistema (fim_data IS NULL), definindo
   * fim_data = NOW(). Disparado pelo cron às 23:59:59 (fuso da aplicação) para que
   * nenhuma execução atravesse a virada do dia. Loga a quantidade encerrada.
   */
  async encerrarExecucoesAbertas(): Promise<void> {
    try {
      const execucoesEncerradas = await this.execucaoRepositorio.encerrarTodasAbertas();
      this.logger.log(`Auto-stop: ${execucoesEncerradas.length} execução(ões) encerrada(s) na virada do dia`);
    } catch (erro) {
      this.logger.error('Auto-stop: falha ao encerrar execuções na virada do dia', erro as Error);
    }
  }

  /**
   * Inicia uma nova execução na atividade informada. A execução pertence sempre ao
   * dono da atividade (execucao → atividade.usuario_id), não a quem dispara.
   * Autorização: gestor inicia qualquer atividade; desenvolvedor apenas as próprias.
   * A regra "sem duas execuções ativas por usuário" recai sobre o dono da atividade.
   */
  async iniciar(
    dto: ExecucaoIniciarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoIniciadaDto>> {
    const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.atividadeId });
    if (!atividadeEncontrada) {
      throw new ResourceNotFoundException('Atividade');
    }

    if (!ExecucaoService.STATUS_EXECUTAVEL.includes(atividadeEncontrada.status)) {
      throw new BusinessException('Só é possível iniciar execução em atividades planejadas ou em desenvolvimento');
    }

    const descricao = dto.descricao?.trim() ?? '';
    if (!descricao && (await this.descricaoObrigatoria(dto.atividadeId))) {
      throw new BusinessException('A descrição é obrigatória');
    }

    // Autorização: gestor inicia qualquer atividade; desenvolvedor apenas as próprias.
    // O gestor não tem linha em demanda_usuario, então o acesso é por tipo + posse da
    // atividade (execucao → atividade.usuario_id), nunca via validarAcessoDemanda.
    if (
      usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR &&
      atividadeEncontrada.usuarioId !== usuarioAtivo.sub
    ) {
      throw new UnauthorizedAccessException('Desenvolvedor não pode iniciar execução em atividade de outro usuário');
    }

    // A regra "sem duas execuções ativas por usuário" recai sobre o DONO da atividade,
    // não sobre quem dispara — o gestor pode ter a própria execução ativa e ainda assim
    // iniciar a de outro usuário.
    const execucaoAtiva = await this.execucaoRepositorio.recuperarAtiva({ usuarioId: atividadeEncontrada.usuarioId });
    if (execucaoAtiva) {
      throw new BusinessException(
        atividadeEncontrada.usuarioId === usuarioAtivo.sub
          ? 'Você já tem uma execução em andamento. Encerre-a antes de iniciar outra'
          : 'O usuário desta atividade já tem uma execução em andamento. Encerre-a antes de iniciar outra',
      );
    }

    const execucaoIniciada = await this.execucaoRepositorio.inserir({
      atividadeId: dto.atividadeId,
      descricao,
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
    dto: ExecucaoEncerrarDto & { id: number },
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoEncerradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id: dto.id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (execucaoEncontrada.fimData !== null) {
      throw new BusinessException('Esta execução já foi encerrada');
    }

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: dto.id });
      if (usuarioDaExecucao !== usuarioAtivo.sub) {
        throw new UnauthorizedAccessException('Desenvolvedor não pode encerrar execução de outro usuário');
      }
    }

    const descricao = dto.descricao?.trim() ?? '';
    if (!descricao && (await this.descricaoObrigatoria(execucaoEncontrada.atividadeId))) {
      throw new BusinessException('A descrição é obrigatória');
    }

    const execucaoEncerrada = await this.execucaoRepositorio.encerrar({ id: dto.id, fimData: new Date(), descricao });

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
  ): Promise<StandardResponse<ExecucaoResumoDto>> {
    const pagina         = filtros.pagina ?? 1;
    const itensPorPagina = filtros.itensPorPagina ?? 20;

    const restricao =
      usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR ? { usuarioId: usuarioAtivo.sub } : undefined;

    const { itens, total, totalMinutosDia } = await this.execucaoRepositorio.listar(filtros, restricao);

    if (filtros.allRows) {
      return {
        sucesso: true,
        dados: {
          itens,
          totalItens:     itens.length,
          paginaAtual:    1,
          itensPorPagina: itens.length,
          totalPaginas:   1,
          totalMinutosDia,
        },
        mensagem: 'Execuções listadas com sucesso',
      };
    }

    const totalPaginas = Math.ceil(total / itensPorPagina);

    return {
      sucesso: true,
      dados: {
        itens,
        totalItens:    total,
        paginaAtual:   pagina,
        itensPorPagina,
        totalPaginas,
        totalMinutosDia,
      },
      mensagem: 'Execuções listadas com sucesso',
    };
  }

  /**
   * Recupera execução por ID.
   * Desenvolvedor só pode acessar as próprias.
   */
  async recuperar(
    dto: ExecucaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoEncerradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id: dto.id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: dto.id });
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
    dto: ExecucaoAlterarDto & { id: number },
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ExecucaoAlteradaDto>> {
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id: dto.id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR) {
      const usuarioDaExecucao = await this.execucaoRepositorio.recuperarUsuario({ execucaoId: dto.id });
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
      id: dto.id,
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
    dto: ExecucaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<void>> {
    const execucaoEncontrada = await this.execucaoRepositorio.recuperar({ id: dto.id });
    if (!execucaoEncontrada) {
      throw new ResourceNotFoundException('Execução');
    }

    await this.execucaoRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Execução excluída com sucesso',
    };
  }

  /**
   * A descrição da execução é obrigatória quando o dono da atividade é
   * desenvolvedor; gestores podem iniciar/encerrar suas execuções sem descrição.
   */
  private async descricaoObrigatoria(atividadeId: number): Promise<boolean> {
    const tipoDono = await this.execucaoRepositorio.recuperarTipoUsuarioDaAtividade({ atividadeId });
    return tipoDono !== TipoUsuarioEnum.GESTOR;
  }
}
