import { Injectable } from '@nestjs/common';
import { ProporIniciarExecucaoDto, PropostaIniciarExecucaoDadosDto, TipoAtividadeStatusEnum, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
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
    'ela é pausada antes (o cartão ou o aviso diz qual). Use o atividadeId de listar_minhas_atividades ou o `atividadeId` devolvido ao criar a atividade; ' +
    'se o usuário não deixar claro qual atividade, e não for um "continuar de onde parei", pergunte antes de propor. ' +
    'Não pergunte o status: ao iniciar uma atividade PENDENTE ou PLANEJADA, passe novoStatus DESENVOLVENDO (o aviso mostra a mudança e o desfazer devolve o status de antes); ' +
    'se já estiver DESENVOLVENDO, omita novoStatus. Uma DESENVOLVIDA não se inicia: no "continuar", siga para a próxima atividade em aberto do checklist e avise; ' +
    'se não houver outra, pergunte o que ele quer fazer. Sem novoStatus, PENDENTE e DESENVOLVIDA são recusadas. ' +
    'O gestor pode iniciar a execução de uma atividade de OUTRA pessoa (passe o atividadeId dela; use listar_minhas_atividades com usuarioId): a execução é do dono da atividade e é a execução em andamento DELE que será pausada.';
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
    // A execução é do DONO da atividade (o gestor age por ele): é a execução ativa dele que a regra "uma por usuário" e a pausa olham.
    const donoId = atividade?.usuarioId ?? usuarioAtivo.sub;
    if (donoId !== usuarioAtivo.sub && !temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new BusinessException('Só o gestor inicia a execução de uma atividade de outra pessoa.');
    }
    const ativa = (await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: donoId }, usuarioAtivo)).dados;
    const aPausar = ativa && ativa.atividadeId !== entrada.atividadeId ? (await this.atividadeService.recuperar({ id: ativa.atividadeId }, usuarioAtivo)).dados : null;

    const dados: PropostaIniciarExecucaoDadosDto = {
      ...entrada,
      atividadeNome: atividade?.nome,
      demandaNome: demanda?.nome,
      ...(donoId !== usuarioAtivo.sub && atividade ? { usuarioNome: atividade.nomeUsuario, usuarioId: donoId } : {}),
      ...(statusMuda ? { statusAnterior: atividade.status as TipoAtividadeStatusEnum } : {}),
      ...(aPausar ? { pausaraAtividadeNome: aPausar.nome } : {}),
    };
    return { ...dados };
  }
}
