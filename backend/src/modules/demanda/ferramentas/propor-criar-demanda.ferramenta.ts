import { Injectable } from '@nestjs/common';
import { ProporCriarDemandaDto, PropostaCriarDemandaDadosDto, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { recuperarPropostaReferenciada } from '../../proposta-ia/domain/proposta-referenciada';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { DemandaRepository } from '../repositories/demanda.repository';

/**
 * Propõe criar uma demanda (de estrutura ou de trabalho, de topo ou filha de uma demanda de estrutura); **não cria nada** (só o clique de
 * Confirmar no cartão cria). Vale o que vale na tela: o gestor cria demandas de topo e filhas; o desenvolvedor só filhas, em projeto
 * em que já trabalha. Uma chamada por demanda; a hierarquia inteira ("Cadastro" e "Novo cadastro" dentro dela) são várias propostas
 * encadeadas por `demandaPaiPropostaId` / `projetoPropostaId`.
 */
@Injectable()
export class ProporCriarDemandaFerramenta extends FerramentaPropostaIa<ProporCriarDemandaDto> {
  readonly nome = 'propor_criar_demanda';
  readonly descricao =
    'Propõe criar UMA demanda. isEstrutural=true cria uma demanda de estrutura (agrupa outras demandas e não recebe atividades); sem ele é uma demanda de trabalho. ' +
    'Informe o projeto por projetoId (de listar_projetos) ou, se o projeto ainda será criado, por projetoPropostaId (o propostaId devolvido por propor_criar_projeto). ' +
    'Para uma demanda filha, informe a pai por demandaPaiId (de listar_demandas_do_projeto; a pai precisa ser de estrutura) ou, se a pai ainda será criada, ' +
    'por demandaPaiPropostaId (o propostaId devolvido por esta ferramenta). Sem pai, é uma demanda de topo (só o gestor cria). ' +
    'Nada é criado até o usuário confirmar no cartão, e as propostas que dependem de outra só funcionam depois que a outra for confirmada. ' +
    'Antes de propor, use listar_demandas_do_projeto para não duplicar uma demanda que já existe. Se o usuário não disser o projeto ou a estrutura, pergunte.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporCriarDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.CRIAR_DEMANDA;

  constructor(
    private readonly propostas: PropostaIaService,
    private readonly projetoService: ProjetoService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {
    super(propostas);
  }

  protected async montarDados(entrada: ProporCriarDemandaDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (!!entrada.projetoId === !!entrada.projetoPropostaId) {
      throw new BusinessException('Informe o projeto por projetoId (projeto existente) ou por projetoPropostaId (projeto proposto), um dos dois');
    }
    if (entrada.demandaPaiId && entrada.demandaPaiPropostaId) {
      throw new BusinessException('Informe a demanda pai por demandaPaiId ou por demandaPaiPropostaId, não os dois');
    }
    if (usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR && !entrada.demandaPaiId && !entrada.demandaPaiPropostaId) {
      throw new BusinessException('O desenvolvedor só cria sub-demandas: informe a demanda de estrutura pai');
    }

    const dados: PropostaCriarDemandaDadosDto = { ...entrada };
    if (entrada.projetoId) {
      // A service confere se o usuário vê o projeto (desenvolvedor sem demanda nele recebe "não encontrado").
      dados.projetoNome = (await this.projetoService.recuperar({ id: entrada.projetoId }, usuarioAtivo)).dados?.nome;
    } else {
      const proposta = await recuperarPropostaReferenciada(this.propostas, entrada.projetoPropostaId as number, TipoPropostaIaEnum.CRIAR_PROJETO, usuarioAtivo);
      dados.projetoNome = String(proposta.dados['nome'] ?? '');
    }

    if (entrada.demandaPaiId) {
      const pai = await this.demandaRepositorio.recuperar({ id: entrada.demandaPaiId });
      if (!pai) throw new ResourceNotFoundException('Demanda pai');
      if (entrada.projetoId && pai.projetoId !== entrada.projetoId) throw new BusinessException('A demanda pai deve pertencer ao mesmo projeto');
      if (!pai.isEstrutural) throw new BusinessException('Apenas demandas de estrutura podem ter sub-demandas');
      dados.demandaPaiNome = pai.nome;
    } else if (entrada.demandaPaiPropostaId) {
      const proposta = await recuperarPropostaReferenciada(this.propostas, entrada.demandaPaiPropostaId, TipoPropostaIaEnum.CRIAR_DEMANDA, usuarioAtivo);
      if (proposta.dados['isEstrutural'] !== true) throw new BusinessException('Apenas demandas de estrutura podem ter sub-demandas');
      dados.demandaPaiNome = String(proposta.dados['nome'] ?? '');
    }
    return { ...dados };
  }
}
