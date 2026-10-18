import { Injectable } from '@nestjs/common';
import { ProporRegistrarExecucaoDto, PropostaRegistrarExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { formatarPeriodo, instanteNoFuso, validarPeriodoDaExecucao } from '../domain/periodo-da-execucao';
import { ExecucaoRepository } from '../repositories/execucao.repository';

/**
 * Propõe registrar um trecho de trabalho **já encerrado** numa atividade (só o gestor: é o que a tela de hoje permite; o
 * desenvolvedor corrige as próprias execuções com `propor_corrigir_execucao`). Converte dia e horas em instantes no fuso do
 * sistema, recusa já aqui período no futuro, invertido ou sobreposto a outra execução do dono, e mostra o período resolvido no cartão.
 */
@Injectable()
export class ProporRegistrarExecucaoFerramenta extends FerramentaPropostaIa<ProporRegistrarExecucaoDto> {
  readonly nome = 'propor_registrar_execucao';
  readonly descricao =
    'Propõe registrar uma execução passada, já encerrada, numa atividade (`atividadeId` de listar_minhas_atividades ou de consulta da equipe), com `data` (yyyy-mm-dd), `horaInicio` e `horaFim` (HH:mm) no horário do sistema e uma `descricao` do que foi feito. ' +
    'Resolva "ontem", "segunda" etc. com consultar_data_e_hora ANTES de propor e confira o resultado no cartão. Nada é registrado até o gestor confirmar (quem conversa com você; a pessoa dona da atividade NÃO precisa confirmar nada). ' +
    'Recusa período no futuro, invertido ou que se sobreponha a outra execução da pessoa. O registro vai para o dono da atividade.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporRegistrarExecucaoDto;
  readonly tipoProposta = TipoPropostaIaEnum.REGISTRAR_EXECUCAO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly configService: ConfigService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporRegistrarExecucaoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const fuso = this.configService.obter().aplicacao.fusoHorario;
    const atividade = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atividade) throw new BusinessException('Atividade não encontrada');

    const inicio = instanteNoFuso(entrada.data, entrada.horaInicio, fuso);
    const fim = instanteNoFuso(entrada.data, entrada.horaFim, fuso);
    validarPeriodoDaExecucao(inicio, fim, this.agora());
    if (await this.execucaoRepositorio.validarSobreposicao({ usuarioId: atividade.usuarioId, inicioData: inicio, fimData: fim })) {
      throw new BusinessException(`Já existe uma execução de ${atividade.nomeUsuario} que se sobrepõe a este período. Avise o usuário.`);
    }

    const demanda = await this.demandaRepositorio.recuperar({ id: atividade.demandaId });
    const dados: PropostaRegistrarExecucaoDadosDto = {
      ...entrada,
      inicioData: inicio.toISOString(),
      fimData: fim.toISOString(),
      periodoTexto: formatarPeriodo(inicio, fim, fuso),
      duracaoMinutos: Math.round((fim.getTime() - inicio.getTime()) / 60000),
      atividadeNome: atividade.nome,
      demandaNome: demanda?.nome,
      usuarioNome: atividade.nomeUsuario,
    };
    return { ...dados };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
