import { Injectable } from '@nestjs/common';
import { ProporDesconectarDemandaDto, PropostaDesconectarDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';

/**
 * Propõe remover a conexão do grafo entre duas demandas (task 230); **não remove nada** ao propor. É uma das duas exceções nomeadas ao "a IA não
 * exclui" (soft delete, desfazível). As demandas não mudam de lugar nem de hierarquia. Só o gestor; confere já aqui que a conexão existe, para o
 * cartão não nascer com uma ligação que não está lá.
 */
@Injectable()
export class ProporDesconectarDemandaFerramenta extends FerramentaPropostaIa<ProporDesconectarDemandaDto> {
  readonly nome = 'propor_desconectar_demanda';
  readonly descricao =
    'Propõe remover a conexão do grafo entre duas demandas (origem → destino, no sentido em que ela existe em consultar_grafo_do_projeto). As demandas continuam onde estão: só a ligação sai. ' +
    'Só o gestor. Só use quando o gestor pedir para desligar duas demandas.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporDesconectarDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.DESCONECTAR_DEMANDA;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporDesconectarDemandaDto, _usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (entrada.demandaOrigemId === entrada.demandaDestinoId) throw new BusinessException('A demanda origem e destino não podem ser a mesma');
    const origem = await this.demandaRepositorio.recuperar({ id: entrada.demandaOrigemId });
    if (!origem) throw new ResourceNotFoundException('Demanda origem');
    const destino = await this.demandaRepositorio.recuperar({ id: entrada.demandaDestinoId });
    if (!destino) throw new ResourceNotFoundException('Demanda destino');
    const conexao = await this.demandaRepositorio.recuperarConexaoPorPar({ demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId });
    if (!conexao) {
      throw new BusinessException(`Não há conexão de "${origem.nome}" para "${destino.nome}" neste sentido. Confira o sentido em consultar_grafo_do_projeto.`);
    }
    const dados: PropostaDesconectarDemandaDadosDto = {
      ...entrada,
      demandaOrigemNome: origem.nome,
      demandaDestinoNome: destino.nome,
      ehBidirecional: conexao.ehBidirecional,
    };
    return { ...dados };
  }
}
