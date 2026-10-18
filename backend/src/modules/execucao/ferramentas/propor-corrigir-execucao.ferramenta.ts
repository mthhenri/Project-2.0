import { Injectable } from '@nestjs/common';
import { ProporCorrigirExecucaoDto, PropostaCorrigirExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { formatarPeriodo, horaNoFuso, instanteNoFuso, validarPeriodoDaExecucao } from '../domain/periodo-da-execucao';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { ExecucaoService } from '../services/execucao.service';

/**
 * Propõe corrigir o início, o fim e/ou a descrição de uma execução existente (o desenvolvedor corrige as próprias; o gestor, qualquer
 * uma: a `ExecucaoService.recuperar` confere). As horas valem no dia de início da execução, no fuso do sistema. Recusa já aqui período
 * no futuro, invertido ou sobreposto a outra execução do mesmo dono, e mostra o período antes e depois no cartão.
 */
@Injectable()
export class ProporCorrigirExecucaoFerramenta extends FerramentaPropostaIa<ProporCorrigirExecucaoDto> {
  readonly nome = 'propor_corrigir_execucao';
  readonly descricao =
    'Propõe corrigir uma execução que já existe: `horaInicio` e/ou `horaFim` (HH:mm, no dia em que a execução começou, no horário do sistema), `data` (yyyy-mm-dd) para mover o trecho de dia e/ou `descricao`. ' +
    'Use para "esqueci de pausar ontem, foi até as 18h". O `execucaoId` vem de listar_minhas_execucoes_do_dia (a execução ainda em andamento também pode ser fechada assim). ' +
    'Resolva datas relativas com consultar_data_e_hora e confira o período no cartão. Nada muda até o usuário confirmar. Recusa período no futuro, invertido ou que se sobreponha a outra execução.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporCorrigirExecucaoDto;
  readonly tipoProposta = TipoPropostaIaEnum.CORRIGIR_EXECUCAO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly execucaoService: ExecucaoService,
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly atividadeService: AtividadeService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly configService: ConfigService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporCorrigirExecucaoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (entrada.data === undefined && entrada.horaInicio === undefined && entrada.horaFim === undefined && entrada.descricao === undefined) {
      throw new BusinessException('Informe o que corrigir: horaInicio, horaFim, data ou descricao');
    }
    const fuso = this.configService.obter().aplicacao.fusoHorario;
    // `recuperar` confere a existência e o dono (desenvolvedor só lê as próprias): erro aqui volta ao modelo, e nenhuma proposta nasce.
    const atual = (await this.execucaoService.recuperar({ id: entrada.execucaoId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Execução não encontrada');

    const dia = entrada.data ?? dataNoFuso(atual.inicioData, fuso);
    const inicio = instanteNoFuso(dia, entrada.horaInicio ?? horaNoFuso(atual.inicioData, fuso), fuso);
    let fim: Date | null;
    if (entrada.horaFim !== undefined) fim = instanteNoFuso(dia, entrada.horaFim, fuso);
    else if (entrada.data !== undefined && atual.fimData) fim = instanteNoFuso(dia, horaNoFuso(atual.fimData, fuso), fuso);
    else fim = atual.fimData;
    validarPeriodoDaExecucao(inicio, fim, this.agora());

    const atividade = (await this.atividadeService.recuperar({ id: atual.atividadeId }, usuarioAtivo)).dados;
    if (atividade && (await this.execucaoRepositorio.validarSobreposicao({ usuarioId: atividade.usuarioId, inicioData: inicio, fimData: fim ?? new Date(8.64e15), ignorarExecucaoId: atual.id }))) {
      throw new BusinessException('O período corrigido se sobrepõe a outra execução da mesma pessoa. Avise o usuário.');
    }
    const demanda = atividade ? await this.demandaRepositorio.recuperar({ id: atividade.demandaId }) : null;

    const dados: PropostaCorrigirExecucaoDadosDto = {
      ...entrada,
      novoInicioData: inicio.toISOString(),
      novoFimData: fim ? fim.toISOString() : null,
      inicioAnteriorData: new Date(atual.inicioData).toISOString(),
      fimAnteriorData: atual.fimData ? new Date(atual.fimData).toISOString() : null,
      descricaoAnterior: atual.descricao,
      periodoAnteriorTexto: formatarPeriodo(new Date(atual.inicioData), atual.fimData ? new Date(atual.fimData) : null, fuso),
      periodoNovoTexto: formatarPeriodo(inicio, fim, fuso),
      duracaoNovaMinutos: fim ? Math.round((fim.getTime() - inicio.getTime()) / 60000) : null,
      atividadeNome: atividade?.nome,
      demandaNome: demanda?.nome,
    };
    return { ...dados };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
