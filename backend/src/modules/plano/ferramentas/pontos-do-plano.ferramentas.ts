import { Injectable } from '@nestjs/common';
import {
  PlanoConsultarDto,
  PlanoPontoAnotarDto,
  PlanoPontoResolverDto,
  TipoPlanoPontoSituacaoEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { PlanoPontoService } from '../services/plano-ponto.service';

/** Anota um ponto em aberto no plano (conversa do planejamento, task 235). Só o painel do plano muda; nada vai para a demanda. */
@Injectable()
export class AnotarPontoEmAbertoFerramenta extends FerramentaIa<PlanoPontoAnotarDto> {
  readonly nome = 'anotar_ponto_em_aberto';
  readonly descricao =
    'Anota no painel do plano algo que ficou em aberto: uma pergunta sem resposta, uma lacuna, uma suposição, algo pesando demais, uma contradição, uma dependência, um risco, algo fora do escopo. ' +
    'O rotulo é livre e curto (ex.: "Lacuna", "Risco"): escolha o que descreve melhor. Escreva o texto como a pessoa leria ("Falta definir quem pode exportar"). Não anote o que já está resolvido no documento nem repita um ponto que já está aberto.';
  readonly tipo = 'RASCUNHO' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoPontoAnotarDto;

  constructor(private readonly planoPontoService: PlanoPontoService) {
    super();
  }

  async executar(entrada: PlanoPontoAnotarDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    const criado = (await this.planoPontoService.criar({ planoId: entrada.planoId, rotulo: entrada.rotulo, texto: entrada.texto }, usuarioAtivo)).dados;
    return { pontoId: criado?.id, mensagem: 'Ponto anotado no painel do plano.' };
  }
}

/** Fecha um ponto: resolvido (com a resposta), dispensado (motivo opcional) ou decisão registrada. */
@Injectable()
export class ResolverPontoDoPlanoFerramenta extends FerramentaIa<PlanoPontoResolverDto> {
  readonly nome = 'resolver_ponto_do_plano';
  readonly descricao =
    'Fecha um ponto em aberto do plano. Quando a pessoa responde a um ponto no chat, use RESOLVIDO com a resposta dela em resolucaoTexto e, em seguida, escreva essa resposta no documento com escrever_no_plano. ' +
    'Use DISPENSADO quando ela disser que não importa (o motivo é opcional) e DECISAO quando ficar decidido algo que vale registrar (resolucaoTexto é a decisão). Os pontos abertos e os ids vêm no começo da conversa.';
  readonly tipo = 'RASCUNHO' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoPontoResolverDto;

  constructor(private readonly planoPontoService: PlanoPontoService) {
    super();
  }

  async executar(entrada: PlanoPontoResolverDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    if (entrada.situacao === TipoPlanoPontoSituacaoEnum.ABERTO) throw new BusinessException('Para reabrir um ponto, a pessoa usa o painel; aqui feche como RESOLVIDO, DISPENSADO ou DECISAO');
    const alterado = (
      await this.planoPontoService.alterarSituacao(
        { planoId: entrada.planoId, id: entrada.pontoId, situacao: entrada.situacao, resolucaoTexto: entrada.resolucaoTexto },
        usuarioAtivo,
      )
    ).dados;
    return { pontoId: alterado?.id, situacao: alterado?.situacao, mensagem: 'Ponto fechado no painel do plano.' };
  }
}

/** Lista os pontos do plano com os ids e as situações de agora. */
@Injectable()
export class ListarPontosDoPlanoFerramenta extends FerramentaIa<PlanoConsultarDto> {
  readonly nome = 'listar_pontos_do_plano';
  readonly descricao = 'Lista os pontos do plano (em aberto, resolvidos, dispensados e decisões) com id, rótulo, texto e resolução. Use para conferir os ids e o que já foi anotado.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoConsultarDto;

  constructor(private readonly planoPontoService: PlanoPontoService) {
    super();
  }

  async executar(entrada: PlanoConsultarDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    const pontos = (await this.planoPontoService.listar({ planoId: entrada.planoId }, usuarioAtivo)).dados ?? [];
    return pontos.map((ponto) => ({ id: ponto.id, rotulo: ponto.rotulo, texto: ponto.texto, situacao: ponto.situacao, resolucao: ponto.resolucaoTexto }));
  }
}
