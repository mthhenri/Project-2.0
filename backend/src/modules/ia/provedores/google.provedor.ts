import { randomUUID } from 'node:crypto';
import { IaException } from '../domain/ia.exception';
import { traduzirErroDeProvedor } from '../domain/ia-erro-provedor';
import { IaProvedor } from '../domain/ia-provedor';
import { IaBloco, IaMensagem, IaMotivoParada, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/** O pedaço do SDK `@google/genai` que o provedor usa; o módulo adapta o SDK real a isto e os testes usam um cliente falso. */
export interface ClienteGoogle {
  gerar(parametros: Record<string, unknown>): Promise<RespostaGoogle>;
  transmitir(parametros: Record<string, unknown>): Promise<AsyncIterable<RespostaGoogle>>;
}

export interface ParteGoogle {
  text?: string;
  /** Pensamento do modelo: nunca vai ao usuário. */
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
}

export interface RespostaGoogle {
  modelVersion?: string;
  candidates?: Array<{ finishReason?: string; content?: { parts?: ParteGoogle[] } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

/**
 * O Gemini nem sempre numera as chamadas de ferramenta; o projeto precisa de um id para casar o resultado, então cria um (único: o chat
 * reenvia as voltas anteriores do dia) e não o devolve ao Gemini. Fica com 36 caracteres porque o chat também pode reenviá-lo à OpenAI,
 * que recusa `tool_call_id` com mais de 40.
 */
const PREFIXO_ID_SINTETICO = 'gem_';

/**
 * Os modelos de raciocínio gastam o teto de tokens pensando, e as chamadas curtas (assunto, nome da conversa) voltariam vazias. Sem o
 * nível analítico pedindo esforço, o pensamento é reduzido ao mínimo que o modelo aceita; `folga` reserva o que ainda assim ele gasta
 * (o 2.5 Pro não desliga o pensamento; o 3 só tem níveis).
 */
function configurarPensamentoLeve(modelo: string): { thinkingConfig: Record<string, unknown>; folga: number } | null {
  const nome = modelo.toLowerCase();
  if (nome.startsWith('gemini-2.5-pro')) return { thinkingConfig: { thinkingBudget: 128 }, folga: 128 };
  if (nome.startsWith('gemini-2.5')) return { thinkingConfig: { thinkingBudget: 0 }, folga: 0 };
  if (nome.startsWith('gemini-3')) return { thinkingConfig: { thinkingLevel: 'low' }, folga: 1024 };
  return null;
}

/**
 * O Google Search do Gemini junto das ferramentas do projeto (`functionDeclarations`) só vale na série 3; nos modelos anteriores a API recusa a
 * mistura. Sem ferramentas do projeto na chamada, a pesquisa vale em qualquer modelo.
 */
function aceitaPesquisaComFerramentas(modelo: string): boolean {
  return modelo.toLowerCase().startsWith('gemini-3');
}

export class GoogleProvedor implements IaProvedor {
  /** `cliente` é `null` quando não há chave de API no ambiente. */
  constructor(private readonly cliente: ClienteGoogle | null) {}

  estaDisponivel(): boolean {
    return this.cliente !== null;
  }

  async gerar(solicitacao: IaSolicitacaoProvedor): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      return this.montarResposta(solicitacao.modelo, [await cliente.gerar(this.montarParametros(solicitacao))]);
    } catch (erro) {
      throw traduzirErroDeProvedor(erro);
    }
  }

  async transmitir(solicitacao: IaSolicitacaoProvedor, aoTrecho: (trecho: string) => void): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      const fluxo = await cliente.transmitir(this.montarParametros(solicitacao));
      const trechos: RespostaGoogle[] = [];
      for await (const trecho of fluxo) {
        trechos.push(trecho);
        for (const parte of trecho.candidates?.[0]?.content?.parts ?? []) {
          if (parte.text && !parte.thought) aoTrecho(parte.text);
        }
      }
      return this.montarResposta(solicitacao.modelo, trechos);
    } catch (erro) {
      throw traduzirErroDeProvedor(erro);
    }
  }

  private exigirCliente(): ClienteGoogle {
    if (!this.cliente) throw new IaException('INDISPONIVEL', 'IA indisponível neste ambiente');
    return this.cliente;
  }

  private montarParametros(solicitacao: IaSolicitacaoProvedor): Record<string, unknown> {
    // O resultado de uma ferramenta precisa do NOME dela (o Gemini não casa por id): vem da chamada que a IA fez antes.
    const nomesDasChamadas = new Map<string, string>();
    for (const mensagem of solicitacao.mensagens) {
      if (typeof mensagem.conteudo === 'string') continue;
      for (const bloco of mensagem.conteudo) if (bloco.tipo === 'uso_ferramenta') nomesDasChamadas.set(bloco.id, bloco.nome);
    }

    const configuracao: Record<string, unknown> = { maxOutputTokens: solicitacao.maximoTokens };
    const pensamentoLeve = solicitacao.esforco ? null : configurarPensamentoLeve(solicitacao.modelo);
    if (pensamentoLeve) {
      configuracao['thinkingConfig'] = pensamentoLeve.thinkingConfig;
      configuracao['maxOutputTokens'] = solicitacao.maximoTokens + pensamentoLeve.folga;
    }
    if (solicitacao.instrucoes) configuracao['systemInstruction'] = solicitacao.instrucoes;
    const temFerramentas = !!solicitacao.ferramentas?.length;
    const ferramentas: Record<string, unknown>[] = [];
    if (temFerramentas) {
      ferramentas.push({
        functionDeclarations: solicitacao.ferramentas!.map((ferramenta) => ({
          name: ferramenta.nome,
          description: ferramenta.descricao,
          parametersJsonSchema: ferramenta.esquemaEntrada,
        })),
      });
    }
    if (solicitacao.pesquisaWeb && (!temFerramentas || aceitaPesquisaComFerramentas(solicitacao.modelo))) {
      ferramentas.push({ googleSearch: {} });
      // Misturada com as nossas, a pesquisa pede que a API devolva também as chamadas que ela mesma fez.
      if (temFerramentas) configuracao['toolConfig'] = { includeServerSideToolInvocations: true };
    }
    if (ferramentas.length) configuracao['tools'] = ferramentas;
    return {
      model: solicitacao.modelo,
      contents: solicitacao.mensagens.map((mensagem) => this.traduzirMensagem(mensagem, nomesDasChamadas)),
      config: configuracao,
    };
  }

  private traduzirMensagem(mensagem: IaMensagem, nomesDasChamadas: Map<string, string>): Record<string, unknown> {
    const role = mensagem.papel === 'usuario' ? 'user' : 'model';
    if (typeof mensagem.conteudo === 'string') return { role, parts: [{ text: mensagem.conteudo }] };
    return {
      role,
      parts: mensagem.conteudo.map((bloco) => {
        switch (bloco.tipo) {
          case 'texto':
            return { text: bloco.texto };
          case 'uso_ferramenta':
            return {
              functionCall: { ...(!bloco.id.startsWith(PREFIXO_ID_SINTETICO) && { id: bloco.id }), name: bloco.nome, args: bloco.entrada },
              ...(bloco.assinatura && { thoughtSignature: bloco.assinatura }),
            };
          case 'resultado_ferramenta':
            return {
              functionResponse: {
                ...(!bloco.usoId.startsWith(PREFIXO_ID_SINTETICO) && { id: bloco.usoId }),
                name: nomesDasChamadas.get(bloco.usoId) ?? '',
                response: bloco.erro ? { error: bloco.conteudo } : { output: bloco.conteudo },
              },
            };
        }
      }),
    };
  }

  /** Junta os pedaços (um só, sem streaming) numa resposta do projeto. */
  private montarResposta(modeloPedido: string, trechos: RespostaGoogle[]): IaRespostaProvedor {
    const blocos: IaBloco[] = [];
    let texto = '';
    let motivo: string | undefined;
    let modelo = modeloPedido;
    let uso: RespostaGoogle['usageMetadata'];

    for (const trecho of trechos) {
      if (trecho.modelVersion) modelo = trecho.modelVersion;
      if (trecho.usageMetadata) uso = trecho.usageMetadata;
      const candidato = trecho.candidates?.[0];
      if (candidato?.finishReason) motivo = candidato.finishReason;
      for (const parte of candidato?.content?.parts ?? []) {
        if (parte.functionCall) {
          const { id, name, args } = parte.functionCall;
          blocos.push({
            tipo: 'uso_ferramenta',
            id: id ?? `${PREFIXO_ID_SINTETICO}${randomUUID().replaceAll('-', '')}`,
            nome: name ?? '',
            entrada: args ?? {},
            ...(parte.thoughtSignature && { assinatura: parte.thoughtSignature }),
          });
        } else if (parte.text && !parte.thought) {
          texto += parte.text;
        }
      }
    }
    if (texto) blocos.unshift({ tipo: 'texto', texto });

    // O Gemini conta o cache dentro do `promptTokenCount` e cobra o raciocínio como saída; o projeto mede a entrada sem o cache.
    const cache = uso?.cachedContentTokenCount ?? 0;
    return {
      texto,
      blocos,
      modelo,
      tokens: {
        entrada: Math.max((uso?.promptTokenCount ?? 0) - cache, 0),
        saida: (uso?.candidatesTokenCount ?? 0) + (uso?.thoughtsTokenCount ?? 0),
        cache,
      },
      motivoParada: this.traduzirMotivo(motivo, blocos),
    };
  }

  private traduzirMotivo(motivo: string | undefined, blocos: IaBloco[]): IaMotivoParada {
    if (blocos.some((bloco) => bloco.tipo === 'uso_ferramenta')) return 'uso_ferramenta';
    if (motivo === 'STOP') return 'fim';
    if (motivo === 'MAX_TOKENS') return 'limite_de_tokens';
    return 'outro';
  }
}
