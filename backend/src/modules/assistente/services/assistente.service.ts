import { Injectable } from '@nestjs/common';
import { AssistenteDescricaoAuxiliadaDto, AssistenteDescricaoAuxiliarDto, NivelIaEnum } from '@project20/shared';
import { traduzirFalhaDeIa } from '../../ia/domain/ia.exception';
import { IaService } from '../../ia/services/ia.service';
import { StandardResponse } from '../../../core/interfaces/standard-response.interface';

/** Teto de tokens da resposta (era `ANTHROPIC_MAXIMO_TOKENS`, que deixou de valer). */
const MAXIMO_TOKENS = 1024;

@Injectable()
export class AssistenteService {
  constructor(private readonly iaService: IaService) {}

  /**
   * Refina, clarifica e complementa a descrição fornecida pelo usuário pela camada de IA (nível padrão).
   */
  async auxiliarDescricao(
    dto: AssistenteDescricaoAuxiliarDto,
  ): Promise<StandardResponse<AssistenteDescricaoAuxiliadaDto>> {
    const tipoEntidadeFormatado = {
      execucao: 'execução de trabalho',
      demanda: 'demanda de projeto',
    }[dto.tipoEntidade];

    const prompt = `Você é um assistente que ajuda desenvolvedores a escrever descrições técnicas mais claras e completas.

Contexto: o usuário está descrevendo uma ${tipoEntidadeFormatado} chamada "${dto.contextoEntidade}".

Texto original do usuário:
${dto.textoOriginal}

Refine, clarifique e complemente esse texto mantendo a voz e intenção original do usuário. Corrija erros gramaticais, melhore a clareza técnica e adicione detalhes relevantes quando faltarem. Responda apenas com o texto refinado, sem explicações adicionais.`;

    try {
      const resposta = await this.iaService.gerar({
        nivel: NivelIaEnum.PADRAO,
        mensagens: [{ papel: 'usuario', conteudo: prompt }],
        maximoTokens: MAXIMO_TOKENS,
      });
      const textoAuxiliado = resposta.texto;

      return {
        sucesso: true,
        dados: { textoOriginal: dto.textoOriginal, textoAuxiliado },
        mensagem: 'Descrição auxiliada com sucesso',
      };
    } catch (erro) {
      throw traduzirFalhaDeIa(erro);
    }
  }
}
