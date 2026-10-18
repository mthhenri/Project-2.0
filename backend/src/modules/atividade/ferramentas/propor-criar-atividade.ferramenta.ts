import { Injectable } from '@nestjs/common';
import { PropostaCriarAtividadeDadosDto, ProporCriarAtividadeDto, TipoPropostaIaEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';

/**
 * Propõe criar uma atividade; **não cria nada** (só o clique de Confirmar no cartão cria). Uma chamada por atividade: várias atividades
 * de uma frase viram várias propostas. A demanda precisa existir (o modelo acha o id em `listar_minhas_atividades`).
 */
@Injectable()
export class ProporCriarAtividadeFerramenta extends FerramentaPropostaIa<ProporCriarAtividadeDto> {
  readonly nome = 'propor_criar_atividade';
  readonly descricao =
    'Propõe criar UMA atividade do usuário numa demanda, com nome e prioridade (URGENTE, ALTA, MEDIA, BAIXA ou INDEFINIDA; defina conforme o que o usuário disse). ' +
    'Nada é criado até o usuário confirmar no cartão. Se o usuário citar várias atividades, chame a ferramenta uma vez para cada. ' +
    'O demandaId vem das atividades já listadas; se o usuário citar uma demanda que você não conhece, pergunte qual é antes de propor.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporCriarAtividadeDto;
  readonly tipoProposta = TipoPropostaIaEnum.CRIAR_ATIVIDADE;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporCriarAtividadeDto, _usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const demanda = await this.demandaRepositorio.recuperar({ id: entrada.demandaId });
    if (!demanda) throw new ResourceNotFoundException('Demanda');
    const dados: PropostaCriarAtividadeDadosDto = { ...entrada, demandaNome: demanda.nome };
    return { ...dados };
  }
}
