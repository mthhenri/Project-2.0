import { Injectable } from '@nestjs/common';
import { PlanoRepository } from '../repositories/plano.repository';
import { PlanoService } from './plano.service';
import { DemandaService } from '../../demanda/services/demanda.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaRepository } from '../../proposta-ia/repositories/proposta-ia.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import {
  DemandaInternoAlterarDto,
  PlanoAbaEnum,
  PlanoDemandaOrigemRecuperadoDto,
  PlanoDemandaOrigemRecuperarDto,
  PlanoInternoPublicarDto,
  PlanoPublicadoDto,
  SituacaoDaAbaNaPublicacaoEnum,
  StandardResponse,
  TipoPropostaIaEnum,
  campoDaAbaDoPlano,
  podeVerAbaDoPlano,
  situacaoDaAbaNaPublicacao,
  textoDaAbaDoPlano,
} from '@project20/shared';

const MENSAGEM_PLANO_MUDOU = 'O plano foi alterado depois de você ver a diferença. Reabra a publicação para ver o que mudou antes de gravar.';

/**
 * Publicar o plano na demanda e dizer de que plano a demanda nasceu (task 237). O plano nunca grava nas colunas da demanda: a gravação passa
 * sempre pela `DemandaService.alterar`, que aplica as permissões de edição de demanda de hoje (membro, gestor e administrador).
 */
@Injectable()
export class PlanoPublicacaoService {
  constructor(
    private readonly planoService: PlanoService,
    private readonly planoRepositorio: PlanoRepository,
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly propostaIaRepositorio: PropostaIaRepository,
  ) {}

  /**
   * Grava na demanda ligada os textos escolhidos do plano e marca a publicação. Descrição do cliente: só gestor e administrador. Texto vazio no plano
   * só apaga o da demanda se a aba estiver em `abasParaApagar`. A versão tem de ser a que a pessoa viu no diff. O plano segue editável depois.
   */
  async publicar(dto: PlanoInternoPublicarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoPublicadoDto>> {
    const plano = (await this.planoService.recuperar({ id: dto.id }, usuarioAtivo)).dados;
    if (plano.demandaId === null) throw new BusinessException('O plano não está ligado a uma demanda');
    if (dto.abas.includes(PlanoAbaEnum.DESCRICAO_CLIENTE) && !podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas gestores publicam a descrição do cliente');
    }
    if (plano.versao !== dto.versao) throw new ConflictException(MENSAGEM_PLANO_MUDOU);

    const demanda = await this.demandaRepositorio.recuperar({ id: plano.demandaId });
    if (!demanda) throw new ResourceNotFoundException('Demanda');

    const alteracoes: DemandaInternoAlterarDto = { id: demanda.id };
    const abasPublicadas: PlanoAbaEnum[] = [];
    for (const aba of dto.abas) {
      const campo = campoDaAbaDoPlano(aba);
      const textoDoPlano = textoDaAbaDoPlano(plano, aba);
      const situacao = situacaoDaAbaNaPublicacao(textoDoPlano, demanda[campo]);
      if (situacao === SituacaoDaAbaNaPublicacaoEnum.IGUAL) continue;
      if (situacao === SituacaoDaAbaNaPublicacaoEnum.APAGARIA && !dto.abasParaApagar?.includes(aba)) {
        throw new BusinessException('O texto do plano está vazio e apagaria o da demanda; escolha apagar explicitamente ou tire a aba da publicação');
      }
      alteracoes[campo] = situacao === SituacaoDaAbaNaPublicacaoEnum.APAGARIA ? null : (textoDoPlano as string);
      abasPublicadas.push(aba);
    }
    if (abasPublicadas.length === 0) throw new BusinessException('Os textos escolhidos já são iguais aos da demanda');

    await this.demandaService.alterar(alteracoes, usuarioAtivo);
    const publicacaoData = await this.planoRepositorio.marcarPublicacao({ planoId: plano.id });
    const trechosPendentes = await this.propostaIaRepositorio.contarPendentesDoPlano({
      planoId: plano.id,
      tipo:    TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO,
    });

    return {
      sucesso:  true,
      dados:    { id: plano.id, demandaId: demanda.id, publicacaoData: publicacaoData as string, abasPublicadas, trechosPendentes },
      mensagem: 'Plano publicado na demanda',
    };
  }

  /** O plano de que a demanda nasceu, entre os que a pessoa pode ver (o mexido há menos tempo primeiro); `null` quando não há nenhum. */
  async recuperarOrigem(
    dto: PlanoDemandaOrigemRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PlanoDemandaOrigemRecuperadoDto | null>> {
    const planos = await this.planoRepositorio.listarPorDemanda({ demandaId: dto.demandaId });
    for (const plano of planos) {
      if (!(await this.planoService.podeAcessar(plano, usuarioAtivo))) continue;
      const origem = { id: plano.id, titulo: plano.titulo, projetoNome: plano.projetoNome, publicacaoData: plano.publicacaoData };
      return { sucesso: true, dados: origem, mensagem: 'Plano de origem recuperado com sucesso' };
    }
    return { sucesso: true, dados: null, mensagem: 'A demanda não nasceu de um plano que você possa ver' };
  }
}
