import { Injectable } from '@nestjs/common';
import { ProporConectarDemandaDto, PropostaConectarDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';

/**
 * Propõe ligar duas demandas do grafo; **não cria nada** (só o clique de Confirmar cria). Só se propõe a conexão que o gestor aceitou depois
 * de a IA sugerir e perguntar. As mesmas recusas da `DemandaService` (mesma demanda, conexão repetida, ciclo) valem já aqui, para o cartão
 * não nascer com uma ligação impossível. Só o gestor.
 */
@Injectable()
export class ProporConectarDemandaFerramenta extends FerramentaPropostaIa<ProporConectarDemandaDto> {
  readonly nome = 'propor_conectar_demanda';
  readonly descricao =
    'Propõe ligar duas demandas do grafo (origem → destino; ehBidirecional liga nos dois sentidos), com o motivo. Só chame DEPOIS de apresentar a sugestão ao gestor e ele aceitar; ' +
    'nunca proponha uma conexão que ele não aceitou. Nada é criado até ele confirmar no cartão. Os ids vêm de listar_demandas_do_projeto ou de sugerir_conexoes_e_lugar.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporConectarDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.CONECTAR_DEMANDA;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporConectarDemandaDto, _usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (entrada.demandaOrigemId === entrada.demandaDestinoId) throw new BusinessException('A demanda origem e destino não podem ser a mesma');
    const origem = await this.demandaRepositorio.recuperar({ id: entrada.demandaOrigemId });
    if (!origem) throw new ResourceNotFoundException('Demanda origem');
    const destino = await this.demandaRepositorio.recuperar({ id: entrada.demandaDestinoId });
    if (!destino) throw new ResourceNotFoundException('Demanda destino');
    const ligacao = { demandaOrigemId: entrada.demandaOrigemId, demandaDestinoId: entrada.demandaDestinoId };
    if (await this.demandaRepositorio.validarConexao(ligacao)) throw new BusinessException('Já existe uma conexão ativa entre essas demandas neste sentido');
    if (await this.demandaRepositorio.verificarCriariaCiclo(ligacao)) throw new BusinessException('Essa conexão criaria um ciclo no grafo de demandas');
    const dados: PropostaConectarDemandaDadosDto = { ...entrada, ehBidirecional: entrada.ehBidirecional ?? false, demandaOrigemNome: origem.nome, demandaDestinoNome: destino.nome };
    return { ...dados };
  }
}
