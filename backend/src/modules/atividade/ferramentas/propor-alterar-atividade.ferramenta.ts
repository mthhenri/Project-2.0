import { Injectable } from '@nestjs/common';
import { ProporAlterarAtividadeDto, PropostaAlterarAtividadeDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';

/**
 * Propõe alterar o status, a prioridade ou o nome de uma atividade; **não altera nada** (só o clique de Confirmar no cartão altera). Lê
 * a atividade com o usuário do token (existência e acesso), descarta o que já está igual e guarda os valores de antes para o cartão e
 * para o desfazer. Mudar o status com execução em andamento é recusado já aqui, com a orientação de pausar antes.
 */
@Injectable()
export class ProporAlterarAtividadeFerramenta extends FerramentaPropostaIa<ProporAlterarAtividadeDto> {
  readonly nome = 'propor_alterar_atividade';
  readonly descricao =
    'Propõe alterar UMA atividade existente: `status` (PLANEJADA, PENDENTE, DESENVOLVENDO ou DESENVOLVIDA), `prioridade` (URGENTE, ALTA, MEDIA, BAIXA ou INDEFINIDA) e/ou `nome`. ' +
    'Informe só o que muda. Use para "terminei a X" (DESENVOLVIDA), "sobe a prioridade da Y" ou "renomeia a Z". Nada muda até o usuário confirmar no cartão. ' +
    'O atividadeId vem de listar_minhas_atividades. Se a atividade tem execução em andamento, a mudança de status é recusada: proponha pausar a execução (propor_pausar_execucao) e só depois o status.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporAlterarAtividadeDto;
  readonly tipoProposta = TipoPropostaIaEnum.ALTERAR_ATIVIDADE;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly atividadeRepositorio: AtividadeRepository,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAlterarAtividadeDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à atividade: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const atividade = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atividade) throw new BusinessException('Atividade não encontrada');

    const muda = {
      status: entrada.status !== undefined && entrada.status !== atividade.status,
      prioridade: entrada.prioridade !== undefined && entrada.prioridade !== atividade.prioridade.codigo,
      nome: entrada.nome !== undefined && entrada.nome !== atividade.nome,
    };
    if (!muda.status && !muda.prioridade && !muda.nome) {
      throw new BusinessException(`A atividade "${atividade.nome}" já está assim: não há o que alterar. Avise o usuário.`);
    }
    if (muda.status && (await this.atividadeRepositorio.possuiExecucaoAtiva({ id: atividade.id }))) {
      throw new BusinessException(
        `A atividade "${atividade.nome}" tem uma execução em andamento e o status não muda com ela ativa. Proponha pausar a execução (propor_pausar_execucao) e só depois alterar o status.`,
      );
    }

    const demanda = await this.demandaRepositorio.recuperar({ id: atividade.demandaId });
    const dados: PropostaAlterarAtividadeDadosDto = {
      atividadeId: atividade.id,
      atividadeNome: atividade.nome,
      demandaNome: demanda?.nome,
      atividadeUsuarioId: atividade.usuarioId,
      ...(muda.status ? { status: entrada.status, statusAnterior: atividade.status } : {}),
      ...(muda.prioridade ? { prioridade: entrada.prioridade, prioridadeAnterior: atividade.prioridade.codigo } : {}),
      ...(muda.nome ? { nome: entrada.nome } : {}),
    };
    return { ...dados };
  }
}
