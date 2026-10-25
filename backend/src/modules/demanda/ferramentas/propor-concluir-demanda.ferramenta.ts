import { Injectable } from '@nestjs/common';
import { ProporConcluirDemandaDto, PropostaConcluirDemandaDadosDto, TipoDemandaStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';

/**
 * Propõe concluir uma demanda (task 229); **não conclui nada** (só o clique de Confirmar no cartão conclui). Lê a demanda com o usuário do token
 * (existência e acesso), recusa a que já está concluída e conta as atividades abertas, que o cartão avisa e que a conclusão não altera.
 */
@Injectable()
export class ProporConcluirDemandaFerramenta extends FerramentaPropostaIa<ProporConcluirDemandaDto> {
  readonly nome = 'propor_concluir_demanda';
  readonly descricao =
    'Propõe concluir UMA demanda ("terminei a demanda X", "pode concluir a Y"). Quem é da demanda e o gestor podem. ' +
    'As atividades abertas da demanda NÃO são alteradas: o cartão só avisa quantas são; se o usuário quer encerrá-las, proponha cada uma com propor_alterar_atividade. ' +
    'Nada muda até o usuário confirmar no cartão. O demandaId vem de listar_minhas_demandas ou listar_demandas_do_projeto.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporConcluirDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.CONCLUIR_DEMANDA;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly projetoService: ProjetoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporConcluirDemandaDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à demanda: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new BusinessException('Demanda não encontrada');
    if (demanda.status === TipoDemandaStatusEnum.CONCLUIDA) {
      throw new BusinessException(`A demanda "${demanda.nome}" já está concluída: não há o que alterar. Avise o usuário.`);
    }
    const projeto = (await this.projetoService.recuperar({ id: demanda.projetoId }, usuarioAtivo)).dados;
    const dados: PropostaConcluirDemandaDadosDto = {
      demandaId: demanda.id,
      demandaNome: demanda.nome,
      projetoNome: projeto?.nome,
      statusAnterior: demanda.status as TipoDemandaStatusEnum,
      atividadesEmAberto: await this.demandaRepositorio.contarAtividadesEmAberto({ id: demanda.id }),
    };
    return { ...dados };
  }
}
