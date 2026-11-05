import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaBloco, IaMensagem, IaMotivoParada, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';

// Tradução do contrato neutro `IaProvedor` para a **Responses API** da OpenAI (spec 261). Os modelos `gpt-6` em diante são usados por ela; os
// anteriores seguem na Chat Completions (`openai.provedor.ts`). Aqui só há funções puras e tipos do pedaço do SDK que o adaptador lê: o cliente
// real é adaptado no `ia.module.ts` e os testes usam um cliente falso.

/** Esforço neutro do projeto → `reasoning.effort` (Responses) e `reasoning_effort` (Chat Completions) da OpenAI. */
export const ESFORCO_OPENAI: Record<EsforcoIaEnum, string> = {
    [EsforcoIaEnum.BAIXO]: 'low',
    [EsforcoIaEnum.MEDIO]: 'medium',
    [EsforcoIaEnum.ALTO]: 'high',
};

/**
 * Os modelos de raciocínio contam o pensamento dentro do teto de tokens da resposta: sem folga, as chamadas curtas (assunto, nome da conversa)
 * voltariam vazias. Quanto maior o esforço, mais ele pensa, então maior a folga. Sem esforço informado vale o baixo.
 */
const FOLGA_DE_RACIOCINIO: Record<EsforcoIaEnum, number> = {
    [EsforcoIaEnum.BAIXO]: 1024,
    [EsforcoIaEnum.MEDIO]: 2048,
    [EsforcoIaEnum.ALTO]: 4096,
};

export function folgaDeRaciocinio(esforco: EsforcoIaEnum | undefined): number {
    return FOLGA_DE_RACIOCINIO[esforco ?? EsforcoIaEnum.BAIXO];
}

/** `gpt-6`, `gpt-6.1-sol`, `gpt-7`... vão para a Responses API. `gpt-5`, `gpt-4o`, `o3` e `chatgpt-*` ficam na Chat Completions. */
const MODELO_DA_RESPOSTAS_API = /^gpt-(?:[6-9]|\d{2,})(?:[.-]|$)/;

export function modeloUsaRespostasApi(modelo: string): boolean {
    return MODELO_DA_RESPOSTAS_API.test(modelo.trim().toLowerCase());
}

export interface UsoRespostasOpenAi {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number | null } | null;
    output_tokens_details?: { reasoning_tokens?: number | null } | null;
}

/** Um item da saída: mensagem (com partes de texto ou recusa), chamada de função ou raciocínio (ignorado). */
export interface ItemDeSaidaRespostasOpenAi {
    type: string;
    content?: Array<{ type: string; text?: string; refusal?: string }> | null;
    call_id?: string;
    name?: string;
    arguments?: string;
}

export interface RespostaRespostasOpenAi {
    model?: string;
    status?: string | null;
    incomplete_details?: { reason?: string | null } | null;
    output?: ItemDeSaidaRespostasOpenAi[] | null;
    usage?: UsoRespostasOpenAi | null;
    error?: { code?: string | null; message?: string | null } | null;
}

/** Os eventos do fluxo que interessam; os demais (criado, em andamento, raciocínio, partes de conteúdo) são ignorados. */
export interface EventoRespostasOpenAi {
    type: string;
    delta?: string;
    item?: ItemDeSaidaRespostasOpenAi;
    response?: RespostaRespostasOpenAi;
    code?: string | null;
    message?: string | null;
}

interface ChamadaDeFerramenta {
    id: string;
    nome: string;
    argumentos: string;
}

export function montarParametrosRespostas(solicitacao: IaSolicitacaoProvedor): Record<string, unknown> {
    const parametros: Record<string, unknown> = {
        model: solicitacao.modelo,
        input: solicitacao.mensagens.flatMap((mensagem) => traduzirMensagem(mensagem)),
        max_output_tokens: solicitacao.maximoTokens + folgaDeRaciocinio(solicitacao.esforco),
        reasoning: { effort: ESFORCO_OPENAI[solicitacao.esforco ?? EsforcoIaEnum.BAIXO] },
        // O histórico é nosso (formato neutro), então nada fica guardado na OpenAI.
        store: false,
    };
    if (solicitacao.instrucoes) parametros['instructions'] = solicitacao.instrucoes;
    if (solicitacao.ferramentas?.length) {
        parametros['tools'] = solicitacao.ferramentas.map((ferramenta) => ({
            type: 'function',
            name: ferramenta.nome,
            description: ferramenta.descricao,
            parameters: ferramenta.esquemaEntrada,
            strict: false,
        }));
    }
    return parametros;
}

/**
 * Uma mensagem do projeto vira vários itens de entrada, na ordem dos blocos. A chamada de função volta só com `call_id` (sem o `id` do item da
 * OpenAI): como o raciocínio do turno anterior não é reenviado, o `id` exigiria o item de raciocínio junto e a API recusaria.
 */
function traduzirMensagem(mensagem: IaMensagem): Record<string, unknown>[] {
    const papel = mensagem.papel === 'usuario' ? 'user' : 'assistant';
    if (typeof mensagem.conteudo === 'string') return [{ role: papel, content: mensagem.conteudo }];

    const itens: Record<string, unknown>[] = [];
    for (const bloco of mensagem.conteudo) {
        switch (bloco.tipo) {
            case 'texto':
                if (bloco.texto !== '') itens.push({ role: papel, content: bloco.texto });
                break;
            case 'uso_ferramenta':
                itens.push({ type: 'function_call', call_id: bloco.id, name: bloco.nome, arguments: JSON.stringify(bloco.entrada) });
                break;
            case 'resultado_ferramenta':
                itens.push({ type: 'function_call_output', call_id: bloco.usoId, output: bloco.erro ? `Erro: ${bloco.conteudo}` : bloco.conteudo });
                break;
        }
    }
    return itens;
}

/** A resposta inteira (sem streaming) em resposta do projeto. */
export function montarRespostaDeRespostas(resposta: RespostaRespostasOpenAi, modeloPedido: string): IaRespostaProvedor {
    exigirSemFalha(resposta);
    const saida = resposta.output ?? [];
    const texto = saida
        .filter((item) => item.type === 'message')
        .flatMap((item) => item.content ?? [])
        .map((parte) => (parte.type === 'output_text' ? (parte.text ?? '') : parte.type === 'refusal' ? (parte.refusal ?? '') : ''))
        .join('');
    return montarResposta(resposta.model ?? modeloPedido, texto, chamadasDaSaida(saida), resposta);
}

/**
 * Consome o fluxo de eventos: o texto sai por `aoTrecho` conforme chega; as chamadas de função vêm completas no fim de cada item; o uso e o
 * motivo de parada vêm do evento final. Fluxo que acaba sem evento final é falha (a resposta foi cortada), nunca uma resposta parcial.
 */
export async function consumirFluxoDeRespostas(
    fluxo: AsyncIterable<EventoRespostasOpenAi>,
    modeloPedido: string,
    aoTrecho: (trecho: string) => void,
): Promise<IaRespostaProvedor> {
    let texto = '';
    let final: RespostaRespostasOpenAi | undefined;
    const chamadas = new Map<string, ChamadaDeFerramenta>();

    for await (const evento of fluxo) {
        switch (evento.type) {
            case 'response.output_text.delta':
                if (evento.delta) {
                    texto += evento.delta;
                    aoTrecho(evento.delta);
                }
                break;
            case 'response.output_item.done':
                for (const chamada of chamadasDaSaida(evento.item ? [evento.item] : [])) chamadas.set(chamada.id, chamada);
                break;
            case 'response.completed':
            case 'response.incomplete':
                final = evento.response;
                break;
            case 'response.failed':
                throw erroDeRespostas(evento.response?.error?.code);
            case 'error':
                throw erroDeRespostas(evento.code);
        }
    }
    if (!final) throw new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');

    // Defesa: o que o evento final traz e o fluxo não entregou (por exemplo uma chamada de função que não gerou o evento do item).
    for (const chamada of chamadasDaSaida(final.output ?? [])) if (!chamadas.has(chamada.id)) chamadas.set(chamada.id, chamada);
    return montarResposta(final.model ?? modeloPedido, texto, [...chamadas.values()], final);
}

function chamadasDaSaida(saida: ItemDeSaidaRespostasOpenAi[]): ChamadaDeFerramenta[] {
    return saida
        .filter((item) => item.type === 'function_call' && !!item.call_id)
        .map((item) => ({ id: item.call_id as string, nome: item.name ?? '', argumentos: item.arguments ?? '' }));
}

function montarResposta(modelo: string, texto: string, chamadas: ChamadaDeFerramenta[], resposta: RespostaRespostasOpenAi): IaRespostaProvedor {
    const blocos: IaBloco[] = [];
    if (texto) blocos.push({ tipo: 'texto', texto });
    for (const chamada of chamadas) blocos.push({ tipo: 'uso_ferramenta', id: chamada.id, nome: chamada.nome, entrada: lerArgumentos(chamada.argumentos) });

    // A OpenAI conta o cache dentro do `input_tokens`; o projeto mede a entrada sem ele (como a Anthropic), para o custo somar certo. O
    // raciocínio já está dentro do `output_tokens` e é cobrado como saída.
    const cache = resposta.usage?.input_tokens_details?.cached_tokens ?? 0;
    return {
        texto,
        blocos,
        modelo,
        tokens: { entrada: Math.max((resposta.usage?.input_tokens ?? 0) - cache, 0), saida: resposta.usage?.output_tokens ?? 0, cache },
        motivoParada: traduzirMotivo(resposta, chamadas.length > 0),
    };
}

function traduzirMotivo(resposta: RespostaRespostasOpenAi, temChamadas: boolean): IaMotivoParada {
    if (temChamadas) return 'uso_ferramenta';
    if (resposta.status === 'completed') return 'fim';
    if (resposta.status === 'incomplete' && resposta.incomplete_details?.reason === 'max_output_tokens') return 'limite_de_tokens';
    return 'outro';
}

/** Resposta que a OpenAI marcou como falha é tratada como falha do provedor, mesmo vindo com HTTP 200. */
function exigirSemFalha(resposta: RespostaRespostasOpenAi): void {
    if (resposta.status === 'failed' || resposta.error) throw erroDeRespostas(resposta.error?.code);
}

function erroDeRespostas(codigo: string | null | undefined): IaException {
    const texto = (codigo ?? '').toLowerCase();
    if (texto.includes('rate_limit') || texto.includes('quota')) return new IaException('LIMITE', 'Limite de uso da IA atingido');
    if (texto.includes('model_not_found') || texto.includes('invalid_api_key') || texto.includes('invalid_prompt') || texto.includes('unsupported')) {
        return new IaException('CONFIGURACAO', 'Configuração da IA inválida (chave ou modelo recusados pelo provedor)');
    }
    return new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');
}

/** Os argumentos chegam como texto JSON; se o modelo gerar um JSON quebrado, a ferramenta recebe a entrada vazia e responde o erro dela. */
function lerArgumentos(argumentos: string): Record<string, unknown> {
    try {
        const lido: unknown = JSON.parse(argumentos || '{}');
        return lido !== null && typeof lido === 'object' && !Array.isArray(lido) ? (lido as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
