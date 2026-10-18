import { Injectable } from '@nestjs/common';
import { ProporIniciarExecucaoDto, PropostaIniciarExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
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
    'se o usuário não deixar claro qual atividade, pergunte antes de propor.';
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
    const ativa = (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados;
    const aPausar = ativa && ativa.atividadeId !== entrada.atividadeId ? (await this.atividadeService.recuperar({ id: ativa.atividadeId }, usuarioAtivo)).dados : null;

    const dados: PropostaIniciarExecucaoDadosDto = {
      ...entrada,
      atividadeNome: atividade?.nome,
      demandaNome: demanda?.nome,
      ...(aPausar ? { pausaraAtividadeNome: aPausar.nome } : {}),
    };
    return { ...dados };
  }
}
