import { Injectable } from '@nestjs/common';
import { campoDaAbaDoPlano, PlanoEscreverDto, PlanoInternoAlterarDto, podeVerAbaDoPlano, textoDaAbaDoPlano } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { PlanoService } from '../services/plano.service';

/**
 * Escreve **direto no rascunho** do plano (conversa do planejamento, task 234): a demanda não muda, só o documento, e gravar na demanda é sempre
 * ato da pessoa (publicar). Passa pela `PlanoService.alterar` com o usuário do token, então valem a regra de acesso, a da descrição do cliente e a
 * da versão: se alguém gravou depois que a IA leu, a escrita é recusada e a IA relê.
 */
@Injectable()
export class EscreverNoPlanoFerramenta extends FerramentaIa<PlanoEscreverDto> {
  readonly nome = 'escrever_no_plano';
  readonly descricao =
    'Escreve no rascunho do plano (nunca na demanda: a pessoa publica depois). Informe a aba (DESCRICAO_TECNICA, DESCRICAO_CLIENTE ou DOCUMENTACAO), o modo (SUBSTITUIR troca o texto da aba inteiro; ACRESCENTAR põe no fim), ' +
    'o texto em Markdown e a versao do documento que você leu. Escreva só depois de perguntar o que faltava. Para mudar apenas um trecho que a pessoa selecionou, use propor_alterar_trecho_do_plano em vez de reescrever a aba. ' +
    'Se a escrita for recusada por versão antiga, releia com consultar_plano e escreva de novo sobre a versão atual. O resultado traz a versão nova: use-a na próxima escrita.';
  readonly tipo = 'RASCUNHO' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoEscreverDto;

  constructor(private readonly planoService: PlanoService) {
    super();
  }

  async executar(entrada: PlanoEscreverDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    if (!podeVerAbaDoPlano(entrada.aba, usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('A descrição do cliente é só de gestor e administrador: não escreva nela nesta conversa');
    }
    if (entrada.texto.trim() === '') throw new BusinessException('Informe o texto a escrever');

    const plano = (await this.planoService.recuperar({ id: entrada.planoId }, usuarioAtivo)).dados;
    if (!plano) throw new BusinessException('Plano não encontrado');
    if (plano.versao !== entrada.versao) {
      throw new ConflictException(`O plano mudou desde que você o leu (versão atual: ${plano.versao}). Releia com consultar_plano e escreva de novo sobre a versão atual.`);
    }

    const atual = textoDaAbaDoPlano(plano, entrada.aba) ?? '';
    const texto = entrada.modo === 'ACRESCENTAR' && atual.trim() !== '' ? `${atual.replace(/\s+$/, '')}\n\n${entrada.texto}` : entrada.texto;
    const alteracao: PlanoInternoAlterarDto = { id: plano.id, versao: entrada.versao, [campoDaAbaDoPlano(entrada.aba)]: texto };
    const gravado = (await this.planoService.alterar(alteracao, usuarioAtivo)).dados;
    return {
      planoId: plano.id,
      aba: entrada.aba,
      versao: gravado?.versao,
      mensagem: 'Escrito no rascunho do plano. A pessoa já vê o texto no documento; diga em uma frase o que você escreveu e onde.',
    };
  }
}
