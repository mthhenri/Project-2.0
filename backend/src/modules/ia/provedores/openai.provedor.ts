import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { traduzirErroDeProvedor } from '../domain/ia-erro-provedor';
import { IaProvedor } from '../domain/ia-provedor';
import { IaBloco, IaMensagem, IaMotivoParada, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/**
 * A OpenAI **não pesquisa na internet** por aqui: a pesquisa dela é uma ferramenta da Responses API (`web_search`), e este provedor usa a Chat
 * Completions, onde só os modelos `*-search-preview` pesquisam. `IaSolicitacao.pesquisaWeb` é ignorado e a resposta sai sem pesquisa; o dia em que o
 * provedor migrar para a Responses API (spec 261) a ferramenta entra aqui.
 */

/** O pedaço do SDK da OpenAI que o provedor usa (Chat Completions); o módulo adapta o SDK real a isto e os testes usam um cliente falso. */
export interface ClienteOpenAi {
  gerar(parametros: Record<string, unknown>): Promise<CompletudeOpenAi>;
  transmitir(parametros: Record<string, unknown>): Promise<AsyncIterable<TrechoOpenAi>>;
}

interface UsoOpenAi {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number | null } | null;
}

export interface CompletudeOpenAi {
  model: string;
  choices: Array<{
    finish_reason?: string | null;
    message: {
      content?: string | null;
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> | null;
    };
  }>;
  usage?: UsoOpenAi | null;
}

export interface TrechoOpenAi {
  model?: string;
  choices: Array<{
    finish_reason?: string | null;
    delta: {
      content?: string | null;
      tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> | null;
    };
  }>;
  usage?: UsoOpenAi | null;
}

/** Esforço neutro do projeto → `reasoning_effort` da OpenAI. */
const ESFORCO_OPENAI: Record<EsforcoIaEnum, string> = {
  [EsforcoIaEnum.BAIXO]: 'low',
  [EsforcoIaEnum.MEDIO]: 'medium',
  [EsforcoIaEnum.ALTO]: 'high',
};

/** Só os modelos de raciocínio (série `o` e `gpt-5`) aceitam `reasoning_effort`; nos outros o parâmetro é recusado. */
const MODELO_DE_RACIOCINIO = /^(o\d|gpt-5)/;

/** Mesmo no esforço baixo o modelo de raciocínio pensa antes de responder, e isso sai do teto; as chamadas curtas (assunto, nome) voltariam vazias. */
const FOLGA_DE_RACIOCINIO = 1024;

const MOTIVOS_DE_PARADA: Record<string, IaMotivoParada> = {
  stop: 'fim',
  length: 'limite_de_tokens',
  tool_calls: 'uso_ferramenta',
};

export class OpenAiProvedor implements IaProvedor {
  /** `cliente` é `null` quando não há chave de API no ambiente. */
  constructor(private readonly cliente: ClienteOpenAi | null) {}

  estaDisponivel(): boolean {
    return this.cliente !== null;
  }

  async gerar(solicitacao: IaSolicitacaoProvedor): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      const completude = await cliente.gerar(this.montarParametros(solicitacao));
      const escolha = completude.choices[0];
      const chamadas = (escolha?.message.tool_calls ?? []).map((chamada) => ({ id: chamada.id, nome: chamada.function.name, argumentos: chamada.function.arguments }));
      return this.montarResposta(completude.model, escolha?.message.content ?? '', chamadas, escolha?.finish_reason, completude.usage);
    } catch (erro) {
      throw traduzirErroDeProvedor(erro);
    }
  }

  async transmitir(solicitacao: IaSolicitacaoProvedor, aoTrecho: (trecho: string) => void): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      const fluxo = await cliente.transmitir({ ...this.montarParametros(solicitacao), stream: true, stream_options: { include_usage: true } });
      let modelo = solicitacao.modelo;
      let texto = '';
      let motivo: string | null | undefined;
      let uso: UsoOpenAi | null | undefined;
      // Os pedaços de uma chamada de ferramenta chegam fatiados e identificados pelo `index`.
      const chamadas = new Map<number, { id: string; nome: string; argumentos: string }>();

      for await (const trecho of fluxo) {
        if (trecho.model) modelo = trecho.model;
        if (trecho.usage) uso = trecho.usage;
        const escolha = trecho.choices[0];
        if (!escolha) continue;
        if (escolha.finish_reason) motivo = escolha.finish_reason;
        if (escolha.delta.content) {
          texto += escolha.delta.content;
          aoTrecho(escolha.delta.content);
        }
        for (const fatia of escolha.delta.tool_calls ?? []) {
          const chamada = chamadas.get(fatia.index) ?? { id: '', nome: '', argumentos: '' };
          if (fatia.id) chamada.id = fatia.id;
          if (fatia.function?.name) chamada.nome += fatia.function.name;
          if (fatia.function?.arguments) chamada.argumentos += fatia.function.arguments;
          chamadas.set(fatia.index, chamada);
        }
      }
      return this.montarResposta(modelo, texto, [...chamadas.entries()].sort(([a], [b]) => a - b).map(([, chamada]) => chamada), motivo, uso);
    } catch (erro) {
      throw traduzirErroDeProvedor(erro);
    }
  }

  private exigirCliente(): ClienteOpenAi {
    if (!this.cliente) throw new IaException('INDISPONIVEL', 'IA indisponível neste ambiente');
    return this.cliente;
  }

  private montarParametros(solicitacao: IaSolicitacaoProvedor): Record<string, unknown> {
    const mensagens: Record<string, unknown>[] = [];
    if (solicitacao.instrucoes) mensagens.push({ role: 'system', content: solicitacao.instrucoes });
    for (const mensagem of solicitacao.mensagens) mensagens.push(...this.traduzirMensagem(mensagem));

    const parametros: Record<string, unknown> = {
      model: solicitacao.modelo,
      max_completion_tokens: solicitacao.maximoTokens,
      messages: mensagens,
    };
    if (solicitacao.ferramentas?.length) {
      parametros['tools'] = solicitacao.ferramentas.map((ferramenta) => ({
        type: 'function',
        function: { name: ferramenta.nome, description: ferramenta.descricao, parameters: ferramenta.esquemaEntrada },
      }));
    }
    // Modelo de raciocínio gasta o teto de tokens pensando: sem o nível analítico pedindo mais, o esforço baixo preserva a resposta.
    if (MODELO_DE_RACIOCINIO.test(solicitacao.modelo.toLowerCase())) {
      parametros['reasoning_effort'] = solicitacao.esforco ? ESFORCO_OPENAI[solicitacao.esforco] : 'low';
      if (!solicitacao.esforco) parametros['max_completion_tokens'] = solicitacao.maximoTokens + FOLGA_DE_RACIOCINIO;
    }
    return parametros;
  }

  /** Uma mensagem do projeto pode virar várias da OpenAI: cada resultado de ferramenta é uma mensagem `tool` própria. */
  private traduzirMensagem(mensagem: IaMensagem): Record<string, unknown>[] {
    if (typeof mensagem.conteudo === 'string') return [{ role: mensagem.papel === 'usuario' ? 'user' : 'assistant', content: mensagem.conteudo }];

    const blocos = mensagem.conteudo;
    const texto = blocos.map((bloco) => (bloco.tipo === 'texto' ? bloco.texto : '')).join('');
    if (mensagem.papel === 'ia') {
      const chamadas = blocos.filter((bloco): bloco is Extract<IaBloco, { tipo: 'uso_ferramenta' }> => bloco.tipo === 'uso_ferramenta');
      return [
        {
          role: 'assistant',
          content: texto || null,
          ...(chamadas.length > 0 && {
            tool_calls: chamadas.map((bloco) => ({ id: bloco.id, type: 'function', function: { name: bloco.nome, arguments: JSON.stringify(bloco.entrada) } })),
          }),
        },
      ];
    }
    const resultados = blocos
      .filter((bloco): bloco is Extract<IaBloco, { tipo: 'resultado_ferramenta' }> => bloco.tipo === 'resultado_ferramenta')
      .map((bloco) => ({ role: 'tool', tool_call_id: bloco.usoId, content: bloco.erro ? `Erro: ${bloco.conteudo}` : bloco.conteudo }));
    return texto ? [...resultados, { role: 'user', content: texto }] : resultados;
  }

  private montarResposta(
    modelo: string,
    texto: string,
    chamadas: Array<{ id: string; nome: string; argumentos: string }>,
    motivo: string | null | undefined,
    uso: UsoOpenAi | null | undefined,
  ): IaRespostaProvedor {
    const blocos: IaBloco[] = [];
    if (texto) blocos.push({ tipo: 'texto', texto });
    for (const chamada of chamadas) blocos.push({ tipo: 'uso_ferramenta', id: chamada.id, nome: chamada.nome, entrada: this.lerArgumentos(chamada.argumentos) });

    // A OpenAI conta o cache dentro do `prompt_tokens`; o projeto mede a entrada sem ele (como a Anthropic), para o custo somar certo.
    const cache = uso?.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      texto,
      blocos,
      modelo,
      tokens: { entrada: Math.max((uso?.prompt_tokens ?? 0) - cache, 0), saida: uso?.completion_tokens ?? 0, cache },
      motivoParada: MOTIVOS_DE_PARADA[motivo ?? ''] ?? 'outro',
    };
  }

  /** Os argumentos chegam como texto JSON; se o modelo gerar um JSON quebrado, a ferramenta recebe a entrada vazia e responde o erro dela. */
  private lerArgumentos(argumentos: string): Record<string, unknown> {
    try {
      const lido: unknown = JSON.parse(argumentos || '{}');
      return lido !== null && typeof lido === 'object' && !Array.isArray(lido) ? (lido as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}
