import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { traduzirErroDeProvedor } from '../domain/ia-erro-provedor';
import { IaProvedor } from '../domain/ia-provedor';
import { IaBloco, IaMensagem, IaMotivoParada, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';
import {
    consumirFluxoDeRespostas,
    ESFORCO_OPENAI,
    EventoRespostasOpenAi,
    folgaDeRaciocinio,
    modeloUsaRespostasApi,
    montarParametrosRespostas,
    montarRespostaDeRespostas,
    RespostaRespostasOpenAi,
} from './openai.respostas';

/**
 * A OpenAI **não pesquisa na internet** por aqui: a pesquisa dela é uma ferramenta da Responses API (`web_search`), e só os modelos `*-search-preview` da
 * Chat Completions pesquisam. `IaSolicitacao.pesquisaWeb` é ignorado nos dois caminhos e a resposta sai sem pesquisa; ligar a ferramenta na Responses API
 * muda custo e comportamento e tem spec própria (294).
 *
 * Dois caminhos (spec 261): os modelos `gpt-6` em diante usam a **Responses API** (`openai.respostas.ts`); os anteriores, a Chat Completions.
 */

/** O pedaço do SDK da OpenAI que o provedor usa; o módulo adapta o SDK real a isto e os testes usam um cliente falso. */
export interface ClienteOpenAi {
    /** Chat Completions, sem streaming. */
    gerar(parametros: Record<string, unknown>): Promise<CompletudeOpenAi>;
    /** Chat Completions, com streaming. */
    transmitir(parametros: Record<string, unknown>): Promise<AsyncIterable<TrechoOpenAi>>;
    /** Responses API, sem streaming. */
    responder(parametros: Record<string, unknown>): Promise<RespostaRespostasOpenAi>;
    /** Responses API, com streaming. */
    transmitirResposta(parametros: Record<string, unknown>): Promise<AsyncIterable<EventoRespostasOpenAi>>;
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

/** Só os modelos de raciocínio (série `o` e `gpt-5`) aceitam `reasoning_effort` na Chat Completions; nos outros o parâmetro é recusado. */
const MODELO_DE_RACIOCINIO = /^(o\d|gpt-5)/;

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
            if (modeloUsaRespostasApi(solicitacao.modelo)) {
                return montarRespostaDeRespostas(await cliente.responder(montarParametrosRespostas(solicitacao)), solicitacao.modelo);
            }
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
            if (modeloUsaRespostasApi(solicitacao.modelo)) {
                const fluxoDeEventos = await cliente.transmitirResposta({ ...montarParametrosRespostas(solicitacao), stream: true });
                return await consumirFluxoDeRespostas(fluxoDeEventos, solicitacao.modelo, aoTrecho);
            }
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
            return this.montarResposta(modelo, texto, [...chamadas.entries()].sort(([item], [outroAtual]) => item - outroAtual).map(([, chamada]) => chamada), motivo, uso);
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
        // Modelo de raciocínio gasta o teto de tokens pensando: o esforço do item da cadeia vai explícito e a folga cresce com ele.
        if (MODELO_DE_RACIOCINIO.test(solicitacao.modelo.toLowerCase())) {
            parametros['reasoning_effort'] = ESFORCO_OPENAI[solicitacao.esforco ?? EsforcoIaEnum.BAIXO];
            parametros['max_completion_tokens'] = solicitacao.maximoTokens + folgaDeRaciocinio(solicitacao.esforco);
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
