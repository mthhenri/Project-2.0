import { Injectable } from '@nestjs/common';
import { NivelIaEnum, PlanoAnaliseAprofundarDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { traduzirFalhaDeIa } from '../../ia/domain/ia.exception';
import { IaService } from '../../ia/services/ia.service';
import { PlanoService } from '../services/plano.service';

/** Teto de tokens da análise aprofundada: ela volta como resultado de ferramenta para a conversa, que a usa para escrever. */
const MAXIMO_TOKENS_DA_ANALISE = 8000;

const INSTRUCOES_DA_ANALISE =
  'Você é o especialista que a conversa de planejamento chama quando o trabalho pede raciocínio mais fundo: achar contradições e lacunas, avaliar se uma demanda está grande demais e como dividi-la, ' +
  'ou redigir um texto longo e delicado. Você recebe o documento do plano como está e o pedido. Responda em português, direto e sem enfeite, só com o que o pedido pede: ' +
  'se for uma análise, os achados em ordem de importância; se for um texto, o texto pronto em Markdown para quem o escreveu colar no documento. ' +
  'Seja conciso: vá ao ponto, sem repetir o documento, e termine sempre a resposta completa. ' +
  'Não invente nomes, prazos ou dados que não estejam no documento ou no pedido, e aponte o que faltar saber em vez de supor.';

/**
 * A escalada da conversa do planejamento (nível padrão) para o modelo mais forte: uma chamada à parte, **no nível analítico**, só quando a conversa
 * julga que precisa (análise de lacunas e contradições, dividir uma demanda, redigir um texto longo). O resultado volta como texto para a conversa
 * usar; nada é escrito no plano por aqui. Roda em nome do usuário: quem não pode ver o plano não o lê.
 */
@Injectable()
export class AprofundarAnaliseDoPlanoFerramenta extends FerramentaIa<PlanoAnaliseAprofundarDto> {
  readonly nome = 'aprofundar_analise_do_plano';
  readonly descricao =
    'Chama o modelo mais forte (mais caro e mais lento) para analisar ou redigir algo no plano aberto. Use só quando o trabalho pedir raciocínio fundo: achar lacunas e contradições do documento todo, ' +
    'avaliar se a demanda está grande demais e como dividi-la, ou redigir um texto longo e delicado. Para o dia a dia (perguntar, escrever um trecho, ajustar, anotar pontos) não use. ' +
    'Informe o plano e o pedido, dizendo claramente o que quer de volta. O resultado vem como texto: use-o para escrever no plano com a ferramenta de escrita; esta ferramenta não escreve nada.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoAnaliseAprofundarDto;

  constructor(
    private readonly planoService: PlanoService,
    private readonly iaService: IaService,
  ) {
    super();
  }

  async executar(entrada: PlanoAnaliseAprofundarDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    const plano = (await this.planoService.recuperar({ id: entrada.planoId }, usuarioAtivo)).dados;
    if (!plano) throw new BusinessException('Plano não encontrado');

    const documento = [
      `Plano: ${plano.titulo}`,
      plano.projetoNome ? `Projeto: ${plano.projetoNome}` : 'Plano pessoal, sem projeto',
      plano.demandaNome ? `Demanda ligada: ${plano.demandaNome}` : 'Nenhuma demanda ligada',
      `Descrição técnica:\n${plano.descricaoTecnica?.trim() || '(vazia)'}`,
      `Descrição do cliente:\n${plano.descricaoCliente?.trim() || '(vazia)'}`,
      `Documentação:\n${plano.documentacao?.trim() || '(vazia)'}`,
    ].join('\n\n');

    try {
      const resposta = await this.iaService.gerar({
        nivel: NivelIaEnum.ANALITICO,
        instrucoes: INSTRUCOES_DA_ANALISE,
        mensagens: [{ papel: 'usuario', conteudo: `${documento}\n\nPEDIDO:\n${entrada.pedido}` }],
        maximoTokens: MAXIMO_TOKENS_DA_ANALISE,
      });
      return { planoId: plano.id, analise: resposta.texto.trim() };
    } catch (erro) {
      throw traduzirFalhaDeIa(erro);
    }
  }
}
