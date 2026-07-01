import { Injectable } from '@nestjs/common';
import { ExecucaoRepository } from '../../execucao/repositories/execucao.repository';
import { CalendarioRepository } from '../../calendario/repositories/calendario.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { PontoJustificativaRepository } from '../../ponto-justificativa/repositories/ponto-justificativa.repository';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import {
  TipoDiaNaoUtilEnum,
  TipoDiaNaoUtilDuracaoEnum,
  ExecucaoListarDto,
  ExecucaoItemDto,
  IntervaloDto,
  PontoConsultarDto,
  PontoDiarioDto,
  PontoTodosConsultarDto,
  PontoMensalConsultarDto,
  PontoMensalDto,
  PontoDiaResumoDto,
  PontoJustificativaResumoDto,
  UsuarioRecuperarDto,
  TipoUsuarioEnum,
} from '@project20/shared';

/**
 * Status de utilidade de uma data específica, compartilhado entre os usuários do mesmo dia.
 * `fracaoMeta` é a fração da jornada exigida no dia: 1 (dia útil integral), 0.5 (meio período)
 * ou 0 (fim de semana ou dia não útil integral).
 */
interface InfoDia {
  fracaoMeta: number;
  motivoNaoUtil: string | null;
}

/** Dados mínimos de usuário necessários para montar o resumo de ponto. */
interface UsuarioPonto {
  id: number;
  nomeCompleto: string;
  horasDiariasNecessarias: number;
}

@Injectable()
export class PontoService {
  constructor(
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly calendarioRepositorio: CalendarioRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly pontoJustificativaRepositorio: PontoJustificativaRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retorna o resumo do ponto diário de um usuário: execuções, horas trabalhadas,
   * intervalos calculados e comparativo com a meta. Desenvolvedor só acessa o próprio.
   */
  async consultarDiario(dto: PontoConsultarDto, usuarioAtivo: JwtPayload): Promise<PontoDiarioDto> {
    const usuarioId = dto.usuarioId ?? usuarioAtivo.sub;

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && usuarioId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException();
    }

    const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: usuarioId });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const infoDia = await this.resolverInfoDia(dto.data);
    return this.montarPontoDiario(usuarioEncontrado, dto.data, infoDia);
  }

  /**
   * Retorna o resumo do ponto de hoje de todos os usuários ativos. Exclusivo de gestor
   * (restrito via @GestorOnly no controller). Usado na visão "todos hoje".
   */
  async consultarTodos(dto: PontoTodosConsultarDto, _usuarioAtivo: JwtPayload): Promise<PontoDiarioDto[]> {
    const usuarios = await this.usuarioRepositorio.listarAtivosComMeta();
    const infoDia = await this.resolverInfoDia(dto.data);

    const resultados: PontoDiarioDto[] = [];
    for (const usuario of usuarios) {
      resultados.push(await this.montarPontoDiario(usuario, dto.data, infoDia));
    }
    return resultados;
  }

  /**
   * Retorna o resumo mensal de um usuário: um item por dia do mês (com totais e saldo
   * diários) e os totais do mês. Desenvolvedor só acessa o próprio.
   */
  async consultarMensal(dto: PontoMensalConsultarDto, usuarioAtivo: JwtPayload): Promise<PontoMensalDto> {
    const usuarioId = dto.usuarioId ?? usuarioAtivo.sub;

    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && usuarioId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException();
    }

    const dtoRecuperar: UsuarioRecuperarDto = { id: usuarioId };
    const usuarioEncontrado = await this.usuarioRepositorio.recuperar(dtoRecuperar);
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const { ano, mes } = dto;
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dataInicio = this.formatarDataIso(ano, mes, 1);
    const dataFim = this.formatarDataIso(ano, mes, diasNoMes);

    const agregadosPorDia = await this.execucaoRepositorio.agruparPorDia({ usuarioId, dataInicio, dataFim });
    const mapaAgregadoPorData = new Map(agregadosPorDia.map((agregado) => [agregado.dia, agregado]));

    const diasNaoUteis = await this.calendarioRepositorio.listarDiasNaoUteisDoMes({ ano, mes });
    const mapaDiaNaoUtilPorDia = new Map(diasNaoUteis.map((diaNaoUtil) => [diaNaoUtil.dia, diaNaoUtil]));

    const justificativasDoMes = await this.pontoJustificativaRepositorio.listarPorUsuarioEMes({ usuarioId, ano, mes });
    const mapaJustificativaPorDia = new Map<number, PontoJustificativaResumoDto>(
      justificativasDoMes.map((justificativa) => [Number(justificativa.diaData.slice(8, 10)), justificativa]),
    );

    const { intervaloMinimoMinutos } = this.configService.obter().negocio;
    const metaDiariaMinutos = usuarioEncontrado.horasDiariasNecessarias * 60;

    let diasUteisMes = 0;
    let totalMinutosTrabalhadosMes = 0;
    let metaMinutosMes = 0;
    const dias: PontoDiaResumoDto[] = [];

    for (let numeroDoDia = 1; numeroDoDia <= diasNoMes; numeroDoDia++) {
      const dataObjeto = new Date(Date.UTC(ano, mes - 1, numeroDoDia));
      const diaDaSemana = dataObjeto.getUTCDay();
      const ehFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;

      const diaNaoUtil = mapaDiaNaoUtilPorDia.get(numeroDoDia) ?? null;
      const registradoComoNaoUtil = !ehFimDeSemana && diaNaoUtil !== null;

      // Fração da jornada exigida no dia: 1 (útil integral), 0.5 (meio período), 0 (fim de
      // semana ou dia não útil integral). Soma das frações compõe a meta do mês.
      let fracaoMeta: number;
      if (ehFimDeSemana || (registradoComoNaoUtil && diaNaoUtil!.duracao === TipoDiaNaoUtilDuracaoEnum.INTEGRAL)) {
        fracaoMeta = 0;
      } else if (registradoComoNaoUtil && diaNaoUtil!.duracao === TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO) {
        fracaoMeta = 0.5;
      } else {
        fracaoMeta = 1;
      }

      const ehDiaUtil = fracaoMeta === 1;
      diasUteisMes += fracaoMeta;

      let motivoNaoUtil: string | null = null;
      if (ehFimDeSemana) {
        motivoNaoUtil = 'Fim de semana';
      } else if (registradoComoNaoUtil) {
        const motivoBase = this.mapearTipoParaMotivo(diaNaoUtil!.tipo);
        motivoNaoUtil = fracaoMeta === 0.5 ? `${motivoBase} (meio período)` : motivoBase;
      }

      const dataIso = this.formatarDataIso(ano, mes, numeroDoDia);
      const agregado = mapaAgregadoPorData.get(dataIso);
      const totalMinutosTrabalhados = agregado?.totalMinutosTrabalhados ?? 0;
      totalMinutosTrabalhadosMes += totalMinutosTrabalhados;

      const justificativa = mapaJustificativaPorDia.get(numeroDoDia) ?? null;
      const minutosCobertos = justificativa ? Math.round(justificativa.horasCobertas * 60) : 0;

      // Meta base do dia (por fração) e, sobre ela, a meta efetiva já descontada a
      // justificativa. Com minutosCobertos === 0 o resultado é idêntico ao anterior.
      const metaDiaBase = fracaoMeta === 0.5
        ? Math.round(metaDiariaMinutos * 0.5)
        : (ehDiaUtil ? metaDiariaMinutos : 0);
      const metaDiaEfetiva = Math.max(0, metaDiaBase - minutosCobertos);
      metaMinutosMes += metaDiaEfetiva;

      let saldoMinutos: number;
      if (fracaoMeta === 0.5) {
        saldoMinutos = Math.min(totalMinutosTrabalhados, metaDiaEfetiva) - metaDiaEfetiva;
      } else {
        saldoMinutos = totalMinutosTrabalhados - metaDiaEfetiva;
      }

      // Intervalos do dia (para a impressão): só há gaps quando há execuções no dia.
      let intervalos: IntervaloDto[] = [];
      if (agregado) {
        const { itens: execucoesDoDia } = await this.execucaoRepositorio.listar(
          { data: dataIso, itensPorPagina: 500 },
          { usuarioId },
        );
        intervalos = this.calcularIntervalos(this.ordenarPorInicio(execucoesDoDia), intervaloMinimoMinutos);
      }

      dias.push({
        data: dataIso,
        ehDiaUtil,
        motivoNaoUtil,
        primeiroInicioData: agregado?.primeiroInicioData ?? null,
        ultimoFimData: agregado?.ultimoFimData ?? null,
        totalMinutosTrabalhados,
        saldoMinutos,
        metaMinutos: metaDiaEfetiva,
        intervalos,
        justificativaNome: justificativa?.nome ?? null,
        justificativaMinutosCobertos: justificativa ? minutosCobertos : null,
      });
    }

    const saldoMinutosMes = totalMinutosTrabalhadosMes - metaMinutosMes;

    return {
      usuarioId,
      nomeUsuario: usuarioEncontrado.nomeCompleto,
      ano,
      mes,
      diasUteisMes,
      metaMinutosMes,
      totalMinutosTrabalhadosMes,
      saldoMinutosMes,
      dias,
    };
  }

  /**
   * Resolve a fração de meta de uma data (1 dia útil integral, 0.5 meio período, 0 fim de
   * semana ou dia não útil integral) e o motivo quando não é dia útil integral. Calculado
   * uma vez por data e reutilizado entre usuários.
   */
  private async resolverInfoDia(data: string): Promise<InfoDia> {
    const dataObjeto = new Date(data);
    const diaDaSemana = dataObjeto.getUTCDay();
    const ehFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;

    if (ehFimDeSemana) {
      return { fracaoMeta: 0, motivoNaoUtil: 'Fim de semana' };
    }

    const diaNaoUtil = await this.calendarioRepositorio.recuperarTipo({ data: dataObjeto });

    if (diaNaoUtil === null) {
      return { fracaoMeta: 1, motivoNaoUtil: null };
    }

    const motivoBase = this.mapearTipoParaMotivo(diaNaoUtil.tipo);

    if (diaNaoUtil.duracao === TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO) {
      return { fracaoMeta: 0.5, motivoNaoUtil: `${motivoBase} (meio período)` };
    }

    return { fracaoMeta: 0, motivoNaoUtil: motivoBase };
  }

  /**
   * Monta o resumo diário de um usuário a partir das suas execuções no dia e do
   * status de utilidade da data já resolvido.
   */
  private async montarPontoDiario(
    usuario: UsuarioPonto,
    data: string,
    infoDia: InfoDia,
  ): Promise<PontoDiarioDto> {
    const filtrosListagem: ExecucaoListarDto = { data, itensPorPagina: 500 };
    const { itens: execucoesDesordenadas } = await this.execucaoRepositorio.listar(
      filtrosListagem,
      { usuarioId: usuario.id },
    );

    const execucoes = this.ordenarPorInicio(execucoesDesordenadas);

    const totalMinutosTrabalhados = execucoes
      .filter((execucao) => execucao.fimData !== null)
      .reduce((acumulador, execucao) => acumulador + (execucao.duracaoMinutos ?? 0), 0);

    const { intervaloMinimoMinutos } = this.configService.obter().negocio;
    const intervalos = this.calcularIntervalos(execucoes, intervaloMinimoMinutos);

    // Justificativa do dia (criada pelo gestor): reduz a meta do dia já reduzida por fração
    // de meio período. Sem justificativa (minutosCobertos === 0) o resultado é idêntico ao
    // comportamento anterior.
    const justificativa = await this.pontoJustificativaRepositorio.recuperarPorUsuarioEDia({
      usuarioId: usuario.id,
      diaData:   data,
    });
    const minutosCobertos = justificativa ? Math.round(justificativa.horasCobertas * 60) : 0;

    const metaMinutosCompleta = usuario.horasDiariasNecessarias * 60;
    const ehDiaUtil = infoDia.fracaoMeta === 1;

    let metaMinutos: number;
    let minutosTrabalhadosDiaUtil: number;
    let minutosTrabalhadosExtra: number;
    let saldoMinutos: number;

    if (infoDia.fracaoMeta === 0.5) {
      // Meio período: meta pela metade (depois descontada a justificativa) e capacidade útil
      // limitada a essa meta — o trabalho que excede vira extra, de modo que o saldo do dia
      // nunca é positivo.
      const metaBase = Math.round(metaMinutosCompleta * 0.5);
      metaMinutos = Math.max(0, metaBase - minutosCobertos);
      minutosTrabalhadosDiaUtil = Math.min(totalMinutosTrabalhados, metaMinutos);
      minutosTrabalhadosExtra = totalMinutosTrabalhados - minutosTrabalhadosDiaUtil;
      saldoMinutos = minutosTrabalhadosDiaUtil - metaMinutos;
    } else {
      // Dias integrais (úteis ou não úteis): meta completa descontada a justificativa.
      metaMinutos = Math.max(0, metaMinutosCompleta - minutosCobertos);
      minutosTrabalhadosDiaUtil = ehDiaUtil ? totalMinutosTrabalhados : 0;
      minutosTrabalhadosExtra = ehDiaUtil ? 0 : totalMinutosTrabalhados;
      saldoMinutos = totalMinutosTrabalhados - metaMinutos;
    }

    return {
      data,
      usuarioId: usuario.id,
      nomeUsuario: usuario.nomeCompleto,
      ehDiaUtil,
      motivoNaoUtil: infoDia.motivoNaoUtil,
      metaMinutos,
      minutosTrabalhadosDiaUtil,
      minutosTrabalhadosExtra,
      totalMinutosTrabalhados,
      saldoMinutos,
      intervalos,
      execucoes,
    };
  }

  /** Ordena execuções por início — pré-requisito do cálculo de intervalos (gaps consecutivos). */
  private ordenarPorInicio(execucoes: ExecucaoItemDto[]): ExecucaoItemDto[] {
    return [...execucoes].sort(
      (execucaoA, execucaoB) =>
        new Date(execucaoA.inicioData).getTime() - new Date(execucaoB.inicioData).getTime(),
    );
  }

  /** Identifica gaps entre execuções consecutivas e retorna os que superam o mínimo. */
  private calcularIntervalos(
    execucoes: ExecucaoItemDto[],
    intervaloMinimoMinutos: number,
  ): IntervaloDto[] {
    const intervalos: IntervaloDto[] = [];
    const execucoesEncerradas = execucoes.filter((execucao) => execucao.fimData !== null);

    for (let indice = 0; indice < execucoesEncerradas.length - 1; indice++) {
      const fimExecucaoAtual = new Date(execucoesEncerradas[indice].fimData as Date);
      const inicioProximaExecucao = new Date(execucoesEncerradas[indice + 1].inicioData);
      const duracaoMinutos = Math.floor(
        (inicioProximaExecucao.getTime() - fimExecucaoAtual.getTime()) / 60000,
      );

      if (duracaoMinutos >= intervaloMinimoMinutos) {
        intervalos.push({ inicioData: fimExecucaoAtual, fimData: inicioProximaExecucao, duracaoMinutos });
      }
    }

    return intervalos;
  }

  /** Converte o enum de tipo de dia não útil para um texto legível em português. */
  private mapearTipoParaMotivo(tipo: TipoDiaNaoUtilEnum | null): string {
    if (tipo === null) return 'Dia não útil';
    const mapeamento: Record<TipoDiaNaoUtilEnum, string> = {
      [TipoDiaNaoUtilEnum.FERIADO]:           'Feriado',
      [TipoDiaNaoUtilEnum.RECESSO]:           'Recesso',
      [TipoDiaNaoUtilEnum.PONTO_FACULTATIVO]: 'Ponto facultativo',
    };
    return mapeamento[tipo];
  }

  /** Formata ano/mês/dia numéricos como string ISO `YYYY-MM-DD`. */
  private formatarDataIso(ano: number, mes: number, dia: number): string {
    const mesFormatado = String(mes).padStart(2, '0');
    const diaFormatado = String(dia).padStart(2, '0');
    return `${ano}-${mesFormatado}-${diaFormatado}`;
  }
}
