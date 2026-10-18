import { Injectable } from '@nestjs/common';
import { ProporAnotarPadDto, PropostaAnotarPadDadosDto, TipoAnotacaoEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { AnotacaoService } from '../services/anotacao.service';

/** As regras que dependem de vários campos juntos (os decoradores só olham um de cada vez). Lança `BusinessException`. */
export function validarOperacaoDeAnotacao(entrada: ProporAnotarPadDto): void {
  if (entrada.secao === TipoAnotacaoEnum.PESSOAL && entrada.pedidoExplicito !== true) {
    throw new BusinessException('A seção Pessoal é do usuário: só se escreve ali quando ele pede explicitamente (pedidoExplicito).');
  }
  if (entrada.operacao === 'ANEXAR') {
    if (!entrada.texto?.trim()) throw new BusinessException('Informe o texto a acrescentar');
    return;
  }
  if (!entrada.trechoAntigo) throw new BusinessException('Informe o trecho a trocar');
  if (entrada.trechoNovo === undefined) throw new BusinessException('Informe o trecho novo');
  if (entrada.trechoNovo === entrada.trechoAntigo) throw new BusinessException('O trecho novo é igual ao antigo: não há o que trocar');
}

/**
 * Executor da proposta `ANOTAR_PAD`: edição **pontual** pela `AnotacaoService`, sempre no pad do usuário do token (o dono nunca vem dos
 * dados). Guarda o texto da seção antes e depois, para **desfazer** restaurar o antes, mas só se a seção ainda está exatamente como a
 * anotação a deixou (senão alguém escreveu depois e o desfazer apagaria o trabalho dessa pessoa).
 */
@Injectable()
export class AnotarPadExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ANOTAR_PAD;

  constructor(private readonly anotacaoService: AnotacaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarOperacaoDeAnotacao(validarDadosDaProposta(PropostaAnotarPadDadosDto, dados));
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAnotarPadDadosDto, dados);
    validarOperacaoDeAnotacao(entrada);
    const usuarioId = usuarioAtivo.sub;
    const antes = await this.lerSecao(entrada.secao, usuarioAtivo);

    let gravada;
    if (entrada.operacao === 'TROCAR') {
      gravada = await this.anotacaoService.trocarTrecho(
        { usuarioId, tipo: entrada.secao, trechoAntigo: entrada.trechoAntigo!, trechoNovo: entrada.trechoNovo! },
        usuarioAtivo,
      );
    } else if (entrada.secao === TipoAnotacaoEnum.FEITO) {
      gravada = await this.anotacaoService.anexarFeito({ usuarioId, texto: entrada.texto! }, usuarioAtivo);
    } else {
      gravada = await this.anotacaoService.anexarTexto({ usuarioId, tipo: entrada.secao, texto: entrada.texto! }, usuarioAtivo);
    }
    return { secao: entrada.secao, operacao: entrada.operacao, textoAntes: antes.texto, textoDepois: gravada.dados?.texto ?? '' };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const secao = resultado['secao'] as TipoAnotacaoEnum;
    if (!Object.values(TipoAnotacaoEnum).includes(secao)) throw new BusinessException('Não há anotação a desfazer nesta proposta');
    const atual = await this.lerSecao(secao, usuarioAtivo);
    if (atual.texto !== resultado['textoDepois']) {
      throw new BusinessException('A seção mudou depois da anotação: não dá para desfazer sem apagar o que foi escrito depois. Ajuste o pad à mão.');
    }
    await this.anotacaoService.alterar(
      { usuarioId: usuarioAtivo.sub, tipo: secao, texto: String(resultado['textoAntes'] ?? ''), updatedDateLido: atual.updatedDate },
      usuarioAtivo,
    );
  }

  private async lerSecao(tipo: TipoAnotacaoEnum, usuarioAtivo: JwtPayload) {
    const secao = (await this.anotacaoService.listar({ usuarioId: usuarioAtivo.sub, tipos: [tipo] }, usuarioAtivo)).dados?.[0];
    if (!secao) throw new BusinessException('Seção do pad não encontrada');
    return secao;
  }
}
