import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AssistenteDescricaoAuxiliadaDto, AssistenteDescricaoAuxiliarDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { StandardResponse } from '../../../core/interfaces/standard-response.interface';

@Injectable()
export class AssistenteService {
  private readonly clienteAnthropic: Anthropic | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.obter().anthropic.apiKey;
    this.clienteAnthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  /**
   * Refina, clarifica e complementa a descrição fornecida pelo usuário via API Anthropic.
   */
  async auxiliarDescricao(
    dto: AssistenteDescricaoAuxiliarDto,
  ): Promise<StandardResponse<AssistenteDescricaoAuxiliadaDto>> {
    if (!this.clienteAnthropic) {
      throw new BusinessException('Recurso de IA não está configurado neste ambiente');
    }

    const configuracao = this.configService.obter().anthropic;

    const tipoEntidadeFormatado = {
      execucao: 'execução de trabalho',
      atividade: 'atividade de desenvolvimento',
      demanda: 'demanda de projeto',
    }[dto.tipoEntidade];

    const prompt = `Você é um assistente que ajuda desenvolvedores a escrever descrições técnicas mais claras e completas.

Contexto: o usuário está descrevendo uma ${tipoEntidadeFormatado} chamada "${dto.contextoEntidade}".

Texto original do usuário:
${dto.textoOriginal}

Refine, clarifique e complemente esse texto mantendo a voz e intenção original do usuário. Corrija erros gramaticais, melhore a clareza técnica e adicione detalhes relevantes quando faltarem. Responda apenas com o texto refinado, sem explicações adicionais.`;

    try {
      const resposta = await this.clienteAnthropic!.messages.create({
        model:      configuracao.modelo,
        max_tokens: configuracao.maximoTokens,
        messages:   [{ role: 'user', content: prompt }],
      });

      const textoAuxiliado = resposta.content
        .filter((bloco) => bloco.type === 'text')
        .map((bloco) => (bloco as { type: 'text'; text: string }).text)
        .join('');

      return {
        sucesso: true,
        dados: { textoOriginal: dto.textoOriginal, textoAuxiliado },
        mensagem: 'Descrição auxiliada com sucesso',
      };
    } catch {
      throw new BusinessException('Serviço de IA temporariamente indisponível');
    }
  }
}
