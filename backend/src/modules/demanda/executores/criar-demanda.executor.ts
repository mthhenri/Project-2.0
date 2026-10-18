import { Injectable } from '@nestjs/common';
import { PropostaCriarDemandaDadosDto, TipoDemandaStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { idCriadoPelaProposta, recuperarPropostaReferenciada } from '../../proposta-ia/domain/proposta-referenciada';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `CRIAR_DEMANDA`: cria pela `DemandaService` com o usuário do token (valem o acesso ao projeto, a regra de pai
 * estrutural e as demais da tela). Quando o projeto ou a demanda pai são de outra proposta, ela precisa já estar confirmada: o id vem
 * do resultado dela. Desfazer só vale enquanto a demanda não tem sub-demanda nem atividade.
 */
@Injectable()
export class CriarDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CRIAR_DEMANDA;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly propostaIaService: PropostaIaService,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaCriarDemandaDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaCriarDemandaDadosDto, dados);

    let projetoId = entrada.projetoId;
    if (!projetoId) {
      const propostaDoProjeto = await recuperarPropostaReferenciada(this.propostaIaService, entrada.projetoPropostaId as number, TipoPropostaIaEnum.CRIAR_PROJETO, usuarioAtivo);
      projetoId = idCriadoPelaProposta(propostaDoProjeto, 'projetoId', `o projeto "${entrada.projetoNome ?? ''}"`);
    }
    let demandaPaiId = entrada.demandaPaiId;
    if (!demandaPaiId && entrada.demandaPaiPropostaId) {
      const propostaDaPai = await recuperarPropostaReferenciada(this.propostaIaService, entrada.demandaPaiPropostaId, TipoPropostaIaEnum.CRIAR_DEMANDA, usuarioAtivo);
      demandaPaiId = idCriadoPelaProposta(propostaDaPai, 'demandaId', `a demanda "${entrada.demandaPaiNome ?? ''}"`);
    }

    const criada = await this.demandaService.criar(
      {
        projetoId,
        demandaPaiId,
        nome: entrada.nome,
        descricaoTecnica: entrada.descricaoTecnica,
        descricaoCliente: entrada.descricaoCliente,
        horasEstimadas: entrada.horasEstimadas ?? 0,
        status: TipoDemandaStatusEnum.PLANEJADA,
        isEstrutural: entrada.isEstrutural ?? false,
        previsaoFimData: entrada.previsaoFimData,
      },
      usuarioAtivo,
    );
    return { demandaId: criada.dados?.id, projetoId, nome: entrada.nome };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const demandaId = Number(resultado['demandaId']);
    if (!Number.isInteger(demandaId)) throw new BusinessException('Não há demanda a desfazer nesta proposta');
    // `recuperar` confere a permissão do usuário sobre a demanda (e a existência).
    await this.demandaService.recuperar({ id: demandaId }, usuarioAtivo);
    if (await this.demandaRepositorio.possuiFilhasOuAtividades({ id: demandaId })) {
      throw new BusinessException('A demanda já tem sub-demandas ou atividades: não dá para desfazer a criação');
    }
    await this.demandaService.excluir({ id: demandaId });
  }
}
