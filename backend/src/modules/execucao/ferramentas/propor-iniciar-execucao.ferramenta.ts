import { Injectable } from '@nestjs/common';
import { ProporIniciarExecucaoDto, PropostaIniciarExecucaoDadosDto, TipoAtividadeStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ExecucaoService } from '../services/execucao.service';

/**
 * Propõe iniciar uma execução; **não inicia nada** (só o clique de Confirmar no cartão inicia). O cartão mostra os nomes da atividade, da
 * demanda e da execução que será pausada antes (se houver), lidos aqui com o usuário do token.
 */
@Injectable()
export class ProporIniciarExecucaoFerramenta extends FerramentaPropostaIa<ProporIniciarExecucaoDto> {
  readonly nome = 'propor_iniciar_execucao';
  readonly descricao =
    'Propõe iniciar uma execução numa atividade do usuário, com uma descrição provisória curta do que ele vai fazer. Se já houver uma execução em andamento, ' +
    'ela é pausada antes (o cartão avisa). Nada começa até o usuário confirmar. Use o atividadeId de listar_minhas_atividades; ' +
    'se o usuário não deixar claro qual atividade, pergunte antes de propor. Só atividades PLANEJADA ou DESENVOLVENDO podem ser iniciadas. ' +
    'Antes de propor, confira o status em listar_minhas_atividades e PERGUNTE ao usuário: se a atividade estiver PENDENTE, se ele quer deixá-la PLANEJADA ou em DESENVOLVENDO; ' +
    'se estiver PLANEJADA, se quer passá-la para DESENVOLVENDO ou iniciar como planejada mesmo. Depois da resposta, proponha com novoStatus (omita para manter o status). ' +
    'Numa DESENVOLVIDA, pergunte o que ele quer fazer. Sem novoStatus, PENDENTE e DESENVOLVIDA são recusadas.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporIniciarExecucaoDto;
  readonly tipoProposta = TipoPropostaIaEnum.INICIAR_EXECUCAO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly execucaoService: ExecucaoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporIniciarExecucaoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à atividade: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const atividade = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    const demanda = atividade ? await this.demandaRepositorio.recuperar({ id: atividade.demandaId }) : null;
    // Mesma regra do `ExecucaoService.iniciar`, conferida já na proposta: sem isso o cartão nasce e só falha no Confirmar.
    // Escolher `novoStatus` (PLANEJADA/DESENVOLVENDO) é o caminho para iniciar uma atividade que ainda não é executável.
    if (atividade && !entrada.novoStatus && !ExecucaoService.STATUS_EXECUTAVEL.includes(atividade.status)) {
      throw new BusinessException(
        `A atividade "${atividade.nome}" está ${atividade.status} e não pode ser iniciada assim. Pergunte ao usuário se quer deixá-la PLANEJADA ou em DESENVOLVENDO e proponha de novo com novoStatus.`,
      );
    }
    const statusMuda = atividade && entrada.novoStatus && entrada.novoStatus !== atividade.status;
    const ativa = (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados;
    const aPausar = ativa && ativa.atividadeId !== entrada.atividadeId ? (await this.atividadeService.recuperar({ id: ativa.atividadeId }, usuarioAtivo)).dados : null;

    const dados: PropostaIniciarExecucaoDadosDto = {
      ...entrada,
      atividadeNome: atividade?.nome,
      demandaNome: demanda?.nome,
      ...(statusMuda ? { statusAnterior: atividade.status as TipoAtividadeStatusEnum } : {}),
      ...(aPausar ? { pausaraAtividadeNome: aPausar.nome } : {}),
    };
    return { ...dados };
  }
}
