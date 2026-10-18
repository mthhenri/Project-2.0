import { Injectable } from '@nestjs/common';
import { ProporAnotarPadDto, TipoPropostaIaEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AnotacaoService } from '../services/anotacao.service';
import { validarOperacaoDeAnotacao } from '../executores/anotar-pad.executor';
import { contarOcorrencias } from '../domain/anotacao-texto';
import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Propõe uma anotação **pontual** no pad do usuário; **não grava nada** (só o clique de Confirmar grava). Nunca reescreve a seção: ou
 * acrescenta um texto ao fim (em Feito, debaixo do título de hoje) ou troca um trecho curto que aparece uma única vez. Para trocar, o
 * trecho é conferido aqui contra a seção de agora, para o modelo corrigir o pedido antes de o usuário ver um cartão que falharia.
 */
@Injectable()
export class ProporAnotarPadFerramenta extends FerramentaPropostaIa<ProporAnotarPadDto> {
  readonly nome = 'propor_anotar_pad';
  readonly descricao =
    'Propõe uma anotação no pad do usuário; nada é gravado até ele confirmar. Seções: EM_ANDAMENTO (o que está sendo feito ou parou), FEITO (o que foi concluído; entra ' +
    'debaixo do título do dia), PENDENCIA (o que falta e depende de algo ou alguém), LEMBRETE (avisos e horários) e PESSOAL (anotações do próprio usuário, como comandos: ' +
    'só escreva ali quando o usuário pedir explicitamente e então passe pedidoExplicito=true). Nunca reescreva a seção: use operacao ANEXAR com um texto curto, ou ' +
    'TROCAR com trechoAntigo (copiado exatamente de consultar_pad e que apareça uma única vez) e trechoNovo. Não reorganize nem apague o que o usuário escreveu.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporAnotarPadDto;
  readonly tipoProposta = TipoPropostaIaEnum.ANOTAR_PAD;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly anotacaoService: AnotacaoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAnotarPadDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    validarOperacaoDeAnotacao(entrada);
    if (entrada.operacao === 'TROCAR') {
      const secao = (await this.anotacaoService.listar({ usuarioId: usuarioAtivo.sub, tipos: [entrada.secao] }, usuarioAtivo)).dados?.[0];
      const ocorrencias = contarOcorrencias(secao?.texto ?? '', entrada.trechoAntigo ?? '');
      if (ocorrencias === 0) throw new BusinessException('O trecho a trocar não foi encontrado na seção; leia a seção com consultar_pad e copie o trecho exatamente.');
      if (ocorrencias > 1) throw new BusinessException('O trecho a trocar aparece mais de uma vez na seção; informe um trecho maior.');
    }
    return { ...entrada };
  }
}
