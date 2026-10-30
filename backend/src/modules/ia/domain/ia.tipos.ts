import { EsforcoIaEnum, NivelIaEnum } from '@project20/shared';

/** Trechos de uma mensagem: texto, pedido de ferramenta (vindo da IA) e resultado de ferramenta (devolvido a ela). */
export type IaBloco =
  | { tipo: 'texto'; texto: string }
  /** `assinatura` é opaca: o provedor a devolve e exige de volta na rodada seguinte (a `thoughtSignature` do Gemini). */
  | { tipo: 'uso_ferramenta'; id: string; nome: string; entrada: Record<string, unknown>; assinatura?: string }
  | { tipo: 'resultado_ferramenta'; usoId: string; conteudo: string; erro?: boolean };

export interface IaMensagem {
  papel: 'usuario' | 'ia';
  conteudo: string | IaBloco[];
}

/** Ferramenta que a IA pode pedir para usar (o contrato já existe; quem as usa é o bloco 5). */
export interface IaFerramenta {
  nome: string;
  descricao: string;
  /** JSON Schema do objeto de entrada. */
  esquemaEntrada: Record<string, unknown>;
}

/** O que quem chama informa: o **nível**, nunca o modelo. */
export interface IaSolicitacao {
  nivel: NivelIaEnum;
  instrucoes?: string;
  mensagens: IaMensagem[];
  ferramentas?: IaFerramenta[];
  /** Teto de tokens da resposta (padrão 1024). */
  maximoTokens?: number;
  /**
   * Liga a pesquisa na internet **do próprio provedor** (o `web_search` da Anthropic, o Google Search do Gemini): o modelo decide quando buscar e já
   * responde com o que achou, sem ferramenta nossa nem laço extra. Provedor ou modelo sem suporte ignora o pedido e responde sem pesquisar.
   */
  pesquisaWeb?: boolean;
}

/** O que o provedor recebe: o nível já resolvido em modelo (e esforço, só no analítico). */
export interface IaSolicitacaoProvedor extends Omit<IaSolicitacao, 'nivel' | 'maximoTokens'> {
  modelo: string;
  esforco?: EsforcoIaEnum;
  maximoTokens: number;
}

export interface IaTokens {
  entrada: number;
  saida: number;
  /** Tokens lidos do cache do provedor (só medição). */
  cache: number;
}

export type IaMotivoParada = 'fim' | 'limite_de_tokens' | 'uso_ferramenta' | 'outro';

export interface IaResposta {
  /** Texto concatenado dos blocos de texto. */
  texto: string;
  blocos: IaBloco[];
  nivel: NivelIaEnum;
  /** Modelo que respondeu. */
  modelo: string;
  tokens: IaTokens;
  motivoParada: IaMotivoParada;
}

/** Resposta antes de o serviço acrescentar o nível. */
export type IaRespostaProvedor = Omit<IaResposta, 'nivel'>;
