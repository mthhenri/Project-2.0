import { Injectable } from '@nestjs/common';
import { ExecucaoRepository } from '../../execucao/repositories/execucao.repository';
import { CalendarioRepository } from '../../calendario/repositories/calendario.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import {
  DiaNaoUtilTipoEnum,
  ExecucaoListarDto,
  ExecucaoResumoDto,
  IntervaloDto,
  PontoConsultarDto,
  PontoDiarioDto,
  UsuarioRecuperarDto,
  UsuarioTipoEnum,
} from '@project20/shared';

@Injectable()
export class PontoService {
  constructor(
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly calendarioRepositorio: CalendarioRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retorna o resumo do ponto diário: execuções, horas trabalhadas,
   * intervalos calculados e comparativo com a meta do usuário.
   */
  async consultarDiario(dto: PontoConsultarDto, usuarioAtivo: JwtPayload): Promise<PontoDiarioDto> {
    const usuarioId = dto.usuarioId ?? usuarioAtivo.sub;

    if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR && usuarioId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException();
    }

    const dtoRecuperar: UsuarioRecuperarDto = { id: usuarioId };
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar(dtoRecuperar);
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const dataObjeto = new Date(dto.data);
    const diaDaSemana = dataObjeto.getUTCDay();
    const ehFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;

    const registradoComoNaoUtil = ehFimDeSemana
      ? false
      : await this.calendarioRepositorio.validarDia({ data: dataObjeto });

    const ehDiaUtil = !ehFimDeSemana && !registradoComoNaoUtil;

    let motivoNaoUtil: string | null = null;
    if (ehFimDeSemana) {
      motivoNaoUtil = 'Fim de semana';
    } else if (registradoComoNaoUtil) {
      const tipoNaoUtil = await this.calendarioRepositorio.recuperarTipo({ data: dataObjeto });
      motivoNaoUtil = this.mapearTipoParaMotivo(tipoNaoUtil);
    }

    const filtrosListagem: ExecucaoListarDto = { data: dto.data, itensPorPagina: 500 };
    const { itens: execucoesDesordenadas } = await this.execucaoRepositorio.listar(
      filtrosListagem,
      usuarioId,
    );

    const execucoes = [...execucoesDesordenadas].sort(
      (execucaoA, execucaoB) =>
        new Date(execucaoA.inicioData).getTime() - new Date(execucaoB.inicioData).getTime(),
    );

    const totalMinutosTrabalhados = execucoes
      .filter((execucao) => execucao.fimData !== null)
      .reduce((acumulador, execucao) => acumulador + (execucao.duracaoMinutos ?? 0), 0);

    const { intervaloMinimoMinutos } = this.configService.obter().negocio;
    const intervalos = this.calcularIntervalos(execucoes, intervaloMinimoMinutos);

    const metaMinutos = usuarioEncontrado.horasDiariasNecessarias * 60;
    const minutosTrabalhadosDiaUtil = ehDiaUtil ? totalMinutosTrabalhados : 0;
    const minutosTrabalhadosExtra   = ehDiaUtil ? 0 : totalMinutosTrabalhados;
    const saldoMinutos              = totalMinutosTrabalhados - metaMinutos;

    return {
      data: dto.data,
      usuarioId,
      nomeUsuario:               usuarioEncontrado.nomeCompleto,
      ehDiaUtil,
      motivoNaoUtil,
      metaMinutos,
      minutosTrabalhadosDiaUtil,
      minutosTrabalhadosExtra,
      totalMinutosTrabalhados,
      saldoMinutos,
      intervalos,
      execucoes,
    };
  }

  /** Identifica gaps entre execuções consecutivas e retorna os que superam o mínimo. */
  private calcularIntervalos(
    execucoes: ExecucaoResumoDto[],
    intervaloMinimoMinutos: number,
  ): IntervaloDto[] {
    const intervalos: IntervaloDto[] = [];
    const execucoesEncerradas = execucoes.filter((execucao) => execucao.fimData !== null);

    for (let indice = 0; indice < execucoesEncerradas.length - 1; indice++) {
      const fimExecucaoAtual      = new Date(execucoesEncerradas[indice].fimData as Date);
      const inicioProximaExecucao = new Date(execucoesEncerradas[indice + 1].inicioData);
      const duracaoMinutos        = Math.floor(
        (inicioProximaExecucao.getTime() - fimExecucaoAtual.getTime()) / 60000,
      );

      if (duracaoMinutos >= intervaloMinimoMinutos) {
        intervalos.push({ inicioData: fimExecucaoAtual, fimData: inicioProximaExecucao, duracaoMinutos });
      }
    }

    return intervalos;
  }

  /** Converte o enum de tipo de dia não útil para um texto legível em português. */
  private mapearTipoParaMotivo(tipo: DiaNaoUtilTipoEnum | null): string {
    if (tipo === null) return 'Dia não útil';
    const mapeamento: Record<DiaNaoUtilTipoEnum, string> = {
      [DiaNaoUtilTipoEnum.FERIADO]:           'Feriado',
      [DiaNaoUtilTipoEnum.RECESSO]:           'Recesso',
      [DiaNaoUtilTipoEnum.PONTO_FACULTATIVO]: 'Ponto facultativo',
    };
    return mapeamento[tipo];
  }
}
