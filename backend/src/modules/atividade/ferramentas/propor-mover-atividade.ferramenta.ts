import { Injectable } from '@nestjs/common';
import { ProporMoverAtividadeDto, PropostaMoverAtividadeDadosDto, TipoDemandaStatusEnum, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AtividadeService } from '../services/atividade.service';

/**
 * Propõe mudar UMA atividade de demanda (task 229); **não move nada** (só o clique de Confirmar no cartão move). Lê a atividade com o usuário do
 * token (existência e acesso), confere dono ou gestor e que a demanda de destino existe, é outra e não está concluída nem cancelada. As execuções vão junto.
 */
@Injectable()
export class ProporMoverAtividadeFerramenta extends FerramentaPropostaIa<ProporMoverAtividadeDto> {
  readonly nome = 'propor_mover_atividade';
  readonly descricao =
    'Propõe mudar UMA atividade para OUTRA demanda ("essa atividade é da demanda Y", "move a X para a Y"). Só o dono da atividade e o gestor podem. ' +
    'As execuções da atividade vão junto. Não serve para a demanda de destino concluída ou cancelada. ' +
    'Nada muda até o usuário confirmar no cartão. O atividadeId vem de listar_minhas_atividades; o demandaDestinoId, de listar_minhas_demandas ou listar_demandas_do_projeto.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporMoverAtividadeDto;
  readonly tipoProposta = TipoPropostaIaEnum.MOVER_ATIVIDADE;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly atividadeService: AtividadeService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporMoverAtividadeDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à atividade: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const atividade = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atividade) throw new BusinessException('Atividade não encontrada');
    if (!temPermissaoDeGestor(usuarioAtivo.tipo) && atividade.usuarioId !== usuarioAtivo.sub) {
      throw new BusinessException('Só o dono da atividade ou o gestor muda a atividade de demanda.');
    }
    if (atividade.demandaId === entrada.demandaDestinoId) {
      throw new BusinessException(`A atividade "${atividade.nome}" já está nessa demanda: não há o que mover. Avise o usuário.`);
    }
    const origem = await this.demandaRepositorio.recuperar({ id: atividade.demandaId });
    const destino = await this.demandaRepositorio.recuperar({ id: entrada.demandaDestinoId });
    if (!destino) throw new ResourceNotFoundException('Demanda de destino');
    if (destino.status === TipoDemandaStatusEnum.CONCLUIDA || destino.status === TipoDemandaStatusEnum.CANCELADA) {
      throw new BusinessException(`A demanda "${destino.nome}" está ${destino.status === TipoDemandaStatusEnum.CONCLUIDA ? 'concluída' : 'cancelada'}: escolha uma demanda em aberto.`);
    }
    const dados: PropostaMoverAtividadeDadosDto = {
      atividadeId: atividade.id,
      demandaDestinoId: destino.id,
      atividadeNome: atividade.nome,
      demandaOrigemId: atividade.demandaId,
      demandaOrigemNome: origem?.nome,
      demandaDestinoNome: destino.nome,
    };
    return { ...dados };
  }
}
