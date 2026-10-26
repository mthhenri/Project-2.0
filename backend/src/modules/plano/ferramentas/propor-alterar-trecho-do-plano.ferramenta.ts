import { Injectable } from '@nestjs/common';
import {
  contarOcorrenciasDoTrecho,
  podeVerAbaDoPlano,
  ProporAlterarTrechoPlanoDto,
  PropostaAlterarTrechoPlanoDadosDto,
  textoDaAbaDoPlano,
  TipoPropostaIaEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { PlanoService } from '../services/plano.service';

/**
 * Propõe a alteração de **um trecho** do documento (conversa do planejamento, task 234): a pessoa selecionou o trecho e pediu a mudança; a IA devolve
 * o trecho novo e o cartão mostra a diferença para ela aceitar ou rejeitar. O trecho antigo precisa estar no texto da aba, uma vez só: do contrário
 * a proposta nem nasce e o motivo volta ao modelo.
 */
@Injectable()
export class ProporAlterarTrechoDoPlanoFerramenta extends FerramentaPropostaIa<ProporAlterarTrechoPlanoDto> {
  readonly nome = 'propor_alterar_trecho_do_plano';
  readonly descricao =
    'Propõe trocar só um trecho do texto de uma aba do plano (a pessoa selecionou o trecho e pediu a mudança). Informe a aba, o trecho antigo copiado EXATAMENTE do texto da aba (use consultar_plano se precisar; ele tem de aparecer uma vez só: ' +
    'se se repetir, inclua palavras ao redor para ficar único) e o trecho novo, que o substitui. Altere somente o trecho pedido: não reescreva o resto da aba. A pessoa vê a diferença no cartão e aceita ou rejeita; nada é gravado antes.';
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = ProporAlterarTrechoPlanoDto;
  readonly tipoProposta = TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly planoService: PlanoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAlterarTrechoPlanoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (!podeVerAbaDoPlano(entrada.aba, usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('A descrição do cliente é só de gestor e administrador: não altere trechos dela nesta conversa');
    }
    if (entrada.trechoAntigo === entrada.trechoNovo) throw new BusinessException('O trecho novo é igual ao antigo: não há o que alterar');

    const plano = (await this.planoService.recuperar({ id: entrada.planoId }, usuarioAtivo)).dados;
    if (!plano) throw new BusinessException('Plano não encontrado');
    const ocorrencias = contarOcorrenciasDoTrecho(textoDaAbaDoPlano(plano, entrada.aba) ?? '', entrada.trechoAntigo);
    if (ocorrencias === 0) {
      throw new BusinessException('O trecho antigo não está no texto dessa aba. Releia com consultar_plano e copie o trecho exatamente como está.');
    }
    if (ocorrencias > 1) {
      throw new BusinessException(`O trecho antigo aparece ${ocorrencias} vezes nessa aba: inclua palavras ao redor para que fique único.`);
    }

    const dados: PropostaAlterarTrechoPlanoDadosDto = {
      planoId: plano.id,
      aba: entrada.aba,
      trechoAntigo: entrada.trechoAntigo,
      trechoNovo: entrada.trechoNovo,
      versao: plano.versao,
      planoTitulo: plano.titulo,
    };
    return { ...dados };
  }
}
