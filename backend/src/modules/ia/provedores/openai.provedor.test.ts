import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { ClienteOpenAi, CompletudeOpenAi, OpenAiProvedor, TrechoOpenAi } from './openai.provedor';
import { EventoRespostasOpenAi, RespostaRespostasOpenAi } from './openai.respostas';

const SOLICITACAO: IaSolicitacaoProvedor = {
    modelo: 'gpt-4.1',
    maximoTokens: 500,
    instrucoes: 'Seja breve.',
    mensagens: [{ papel: 'usuario', conteudo: 'oi' }],
};

const COMPLETUDE: CompletudeOpenAi = {
    model: 'gpt-4.1-2026-01-01',
    choices: [{ finish_reason: 'stop', message: { content: 'olá mundo' } }],
    usage: { prompt_tokens: 17, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 7 } },
};

const RESPOSTA_RESPOSTAS: RespostaRespostasOpenAi = {
    model: 'gpt-6.1-sol-2026-10-01',
    status: 'completed',
    output: [
        { type: 'reasoning' },
        { type: 'message', content: [{ type: 'output_text', text: 'olá ' }, { type: 'output_text', text: 'sol' }] },
    ],
    usage: { input_tokens: 30, output_tokens: 12, input_tokens_details: { cached_tokens: 10 }, output_tokens_details: { reasoning_tokens: 8 } },
};

function clienteFalso(opcoes: { completude?: CompletudeOpenAi; trechos?: TrechoOpenAi[]; resposta?: RespostaRespostasOpenAi; eventos?: EventoRespostasOpenAi[]; erro?: unknown; modelos?: unknown[][]; erroNaListagem?: unknown } = {}) {
    const chamadas: Record<string, unknown>[] = [];
    const cliente: ClienteOpenAi = {
        async gerar(parametros) {
            chamadas.push(parametros);
            if (opcoes.erro) throw opcoes.erro;
            return opcoes.completude ?? COMPLETUDE;
        },
        async transmitir(parametros) {
            chamadas.push(parametros);
            if (opcoes.erro) throw opcoes.erro;
            return (async function* () {
                yield* opcoes.trechos ?? [];
            })();
        },
        async responder(parametros) {
            chamadas.push(parametros);
            if (opcoes.erro) throw opcoes.erro;
            return opcoes.resposta ?? RESPOSTA_RESPOSTAS;
        },
        async transmitirResposta(parametros) {
            chamadas.push(parametros);
            if (opcoes.erro) throw opcoes.erro;
            return (async function* () {
                yield* opcoes.eventos ?? [];
            })();
        },
        listarModelos() {
            chamadas.push({ listagem: true });
            return (async function* () {
                if (opcoes.erroNaListagem) throw opcoes.erroNaListagem;
                for (const pagina of opcoes.modelos ?? []) yield* pagina as never[];
            })();
        },
    };
    return { cliente, chamadas };
}

test('gerar monta os parâmetros (instruções como mensagem system) e devolve texto, modelo, tokens sem o cache contado duas vezes e motivo', async () => {
    const { cliente, chamadas } = clienteFalso();
    const resposta = await new OpenAiProvedor(cliente).gerar(SOLICITACAO);

    assert.deepEqual(chamadas[0], {
        model: 'gpt-4.1',
        max_completion_tokens: 500,
        messages: [
            { role: 'system', content: 'Seja breve.' },
            { role: 'user', content: 'oi' },
        ],
    });
    assert.equal(resposta.texto, 'olá mundo');
    assert.equal(resposta.modelo, 'gpt-4.1-2026-01-01');
    assert.deepEqual(resposta.tokens, { entrada: 10, saida: 4, cache: 7 });
    assert.equal(resposta.motivoParada, 'fim');
});

test('esforço: só modelo de raciocínio recebe reasoning_effort (o analítico pede o esforço da configuração; os outros níveis, baixo)', async () => {
    const { cliente, chamadas } = clienteFalso();
    const provedor = new OpenAiProvedor(cliente);
    await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-4.1', esforco: EsforcoIaEnum.ALTO });
    await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-5', esforco: EsforcoIaEnum.ALTO });
    await provedor.gerar({ ...SOLICITACAO, modelo: 'o3' });

    assert.equal('reasoning_effort' in chamadas[0], false);
    assert.equal(chamadas[1]['reasoning_effort'], 'high');
    assert.equal(chamadas[2]['reasoning_effort'], 'low');
});

test('teto: o modelo de raciocínio ganha folga para o pensamento, maior quanto maior o esforço; sem raciocínio o teto é o pedido', async () => {
    const { cliente, chamadas } = clienteFalso();
    const provedor = new OpenAiProvedor(cliente);
    await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-5-mini', maximoTokens: 10 });
    await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-5', maximoTokens: 10, esforco: EsforcoIaEnum.ALTO });
    await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-4.1', maximoTokens: 10 });

    assert.deepEqual(chamadas.map((chamada) => chamada['max_completion_tokens']), [1034, 4106, 10]);
});

test('ferramentas: definições, uso pela IA (com argumentos JSON) e resultados viram mensagens assistant/tool', async () => {
    const completude: CompletudeOpenAi = {
        model: 'gpt-4.1',
        choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'call_1', function: { name: 'listar', arguments: '{"limite":3}' } }] } }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
    };
    const { cliente, chamadas } = clienteFalso({ completude });
    const resposta = await new OpenAiProvedor(cliente).gerar({
        ...SOLICITACAO,
        ferramentas: [{ nome: 'listar', descricao: 'Lista', esquemaEntrada: { type: 'object' } }],
        mensagens: [
            { papel: 'usuario', conteudo: 'liste' },
            { papel: 'ia', conteudo: [{ tipo: 'texto', texto: 'vou listar' }, { tipo: 'uso_ferramenta', id: 'call_0', nome: 'listar', entrada: { limite: 1 } }] },
            { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'call_0', conteudo: '[]' }, { tipo: 'resultado_ferramenta', usoId: 'call_9', conteudo: 'falhou', erro: true }] },
        ],
    });

    assert.deepEqual(chamadas[0]['tools'], [{ type: 'function', function: { name: 'listar', description: 'Lista', parameters: { type: 'object' } } }]);
    assert.deepEqual(chamadas[0]['messages'], [
        { role: 'system', content: 'Seja breve.' },
        { role: 'user', content: 'liste' },
        { role: 'assistant', content: 'vou listar', tool_calls: [{ id: 'call_0', type: 'function', function: { name: 'listar', arguments: '{"limite":1}' } }] },
        { role: 'tool', tool_call_id: 'call_0', content: '[]' },
        { role: 'tool', tool_call_id: 'call_9', content: 'Erro: falhou' },
    ]);
    assert.equal(resposta.motivoParada, 'uso_ferramenta');
    assert.deepEqual(resposta.blocos, [{ tipo: 'uso_ferramenta', id: 'call_1', nome: 'listar', entrada: { limite: 3 } }]);
});

test('argumentos de ferramenta com JSON quebrado viram entrada vazia, sem derrubar a resposta', async () => {
    const completude: CompletudeOpenAi = {
        model: 'gpt-4.1',
        choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [{ id: 'c', function: { name: 'x', arguments: '{quebrado' } }] } }],
    };
    const resposta = await new OpenAiProvedor(clienteFalso({ completude }).cliente).gerar(SOLICITACAO);
    assert.deepEqual(resposta.blocos, [{ tipo: 'uso_ferramenta', id: 'c', nome: 'x', entrada: {} }]);
});

test('transmitir entrega os trechos, monta a chamada de ferramenta fatiada e usa o uso do último pedaço', async () => {
    const { cliente, chamadas } = clienteFalso({
        trechos: [
            { model: 'gpt-4.1', choices: [{ delta: { content: 'olá ' } }] },
            { choices: [{ delta: { content: 'mundo' } }] },
            { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'lis', arguments: '{"lim' } }] } }] },
            { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'tar', arguments: 'ite":3}' } }] } }] },
            { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
            { choices: [], usage: { prompt_tokens: 9, completion_tokens: 3 } },
        ],
    });
    const trechos: string[] = [];
    const resposta = await new OpenAiProvedor(cliente).transmitir(SOLICITACAO, (trecho) => trechos.push(trecho));

    assert.equal(chamadas[0]['stream'], true);
    assert.deepEqual(chamadas[0]['stream_options'], { include_usage: true });
    assert.deepEqual(trechos, ['olá ', 'mundo']);
    assert.equal(resposta.texto, 'olá mundo');
    assert.deepEqual(resposta.blocos, [
        { tipo: 'texto', texto: 'olá mundo' },
        { tipo: 'uso_ferramenta', id: 'call_1', nome: 'listar', entrada: { limite: 3 } },
    ]);
    assert.deepEqual(resposta.tokens, { entrada: 9, saida: 3, cache: 0 });
    assert.equal(resposta.motivoParada, 'uso_ferramenta');
});

test('motivos de parada: length vira limite de tokens; desconhecido vira outro', async () => {
    const comMotivo = (motivo: string): CompletudeOpenAi => ({ model: 'm', choices: [{ finish_reason: motivo, message: { content: 'x' } }] });
    const provedor = (completude: CompletudeOpenAi) => new OpenAiProvedor(clienteFalso({ completude }).cliente);
    assert.equal((await provedor(comMotivo('length')).gerar(SOLICITACAO)).motivoParada, 'limite_de_tokens');
    assert.equal((await provedor(comMotivo('content_filter')).gerar(SOLICITACAO)).motivoParada, 'outro');
});

test('sem cliente (sem chave) o provedor está indisponível e recusa a chamada', async () => {
    const provedor = new OpenAiProvedor(null);
    assert.equal(provedor.estaDisponivel(), false);
    await assert.rejects(() => provedor.gerar(SOLICITACAO), (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL');
    await assert.rejects(() => provedor.transmitir(SOLICITACAO, () => undefined), IaException);
});

test('erros do SDK viram IaException pelo status, nunca o erro cru', async () => {
    const tentar = (erro: unknown) => new OpenAiProvedor(clienteFalso({ erro }).cliente).gerar(SOLICITACAO).catch((falha: unknown) => falha);
    assert.equal(((await tentar({ status: 429 })) as IaException).motivo, 'LIMITE');
    assert.equal(((await tentar({ status: 401 })) as IaException).motivo, 'CONFIGURACAO');
    assert.equal(((await tentar({ status: 503 })) as IaException).motivo, 'INDISPONIVEL');
    assert.equal(((await tentar(new Error('rede'))) as IaException).motivo, 'INDISPONIVEL');
});

test('pesquisaWeb é ignorado: a Chat Completions da OpenAI não pesquisa, e nada de pesquisa vai nos parâmetros', async () => {
    const { cliente, chamadas } = clienteFalso();
    await new OpenAiProvedor(cliente).gerar({ ...SOLICITACAO, pesquisaWeb: true });
    assert.equal(chamadas[0]['tools'], undefined);
    assert.equal(chamadas[0]['web_search_options'], undefined);
});

// Responses API (spec 261): os modelos gpt-6 em diante.

const SOL: IaSolicitacaoProvedor = { ...SOLICITACAO, modelo: 'gpt-6.1-sol', esforco: EsforcoIaEnum.MEDIO };

test('roteamento: gpt-6 em diante usa a Responses API; gpt-5, gpt-4 e série o continuam na Chat Completions', async () => {
    const { cliente, chamadas } = clienteFalso();
    const provedor = new OpenAiProvedor(cliente);
    for (const modelo of ['gpt-6', 'gpt-6.1-sol', 'GPT-7-mini', 'gpt-10']) await provedor.gerar({ ...SOL, modelo });
    for (const modelo of ['gpt-5', 'gpt-4.1', 'o3', 'chatgpt-4o-latest']) await provedor.gerar({ ...SOL, modelo });

    assert.deepEqual(chamadas.slice(0, 4).map((chamada) => 'input' in chamada), [true, true, true, true]);
    assert.deepEqual(chamadas.slice(4).map((chamada) => 'messages' in chamada), [true, true, true, true]);
});

test('Responses API: monta instruções, entrada, esforço do item, teto com folga e nada guardado na OpenAI; devolve texto, modelo, tokens e motivo', async () => {
    const { cliente, chamadas } = clienteFalso();
    const resposta = await new OpenAiProvedor(cliente).gerar(SOL);

    assert.deepEqual(chamadas[0], {
        model: 'gpt-6.1-sol',
        input: [{ role: 'user', content: 'oi' }],
        max_output_tokens: 500 + 2048,
        reasoning: { effort: 'medium' },
        store: false,
        instructions: 'Seja breve.',
    });
    assert.equal(resposta.texto, 'olá sol');
    assert.equal(resposta.modelo, 'gpt-6.1-sol-2026-10-01');
    assert.deepEqual(resposta.tokens, { entrada: 20, saida: 12, cache: 10 }, 'o cache sai da entrada e o raciocínio já está na saída');
    assert.equal(resposta.motivoParada, 'fim');
});

test('Responses API: cada esforço vai explícito (baixo, médio, alto) e sem esforço vale o baixo', async () => {
    const { cliente, chamadas } = clienteFalso();
    const provedor = new OpenAiProvedor(cliente);
    await provedor.gerar({ ...SOL, esforco: EsforcoIaEnum.BAIXO });
    await provedor.gerar({ ...SOL, esforco: EsforcoIaEnum.MEDIO });
    await provedor.gerar({ ...SOL, esforco: EsforcoIaEnum.ALTO });
    await provedor.gerar({ ...SOL, esforco: undefined });
    assert.deepEqual(chamadas.map((chamada) => (chamada['reasoning'] as { effort: string }).effort), ['low', 'medium', 'high', 'low']);
    assert.deepEqual(chamadas.map((chamada) => chamada['max_output_tokens']), [1524, 2548, 4596, 1524]);
});

test('Responses API: ferramentas, uso pela IA (call_id, sem o id do item) e resultados viram function_call e function_call_output', async () => {
    const resposta: RespostaRespostasOpenAi = {
        model: 'gpt-6.1-sol',
        status: 'completed',
        output: [{ type: 'function_call', call_id: 'call_1', name: 'listar', arguments: '{"limite":3}' }],
        usage: { input_tokens: 5, output_tokens: 2 },
    };
    const { cliente, chamadas } = clienteFalso({ resposta });
    const devolvida = await new OpenAiProvedor(cliente).gerar({
        ...SOL,
        ferramentas: [{ nome: 'listar', descricao: 'Lista', esquemaEntrada: { type: 'object' } }],
        mensagens: [
            { papel: 'usuario', conteudo: 'liste' },
            { papel: 'ia', conteudo: [{ tipo: 'texto', texto: 'vou listar' }, { tipo: 'uso_ferramenta', id: 'call_0', nome: 'listar', entrada: { limite: 1 } }] },
            { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'call_0', conteudo: '[]' }, { tipo: 'resultado_ferramenta', usoId: 'call_9', conteudo: 'falhou', erro: true }] },
        ],
    });

    assert.deepEqual(chamadas[0]['tools'], [{ type: 'function', name: 'listar', description: 'Lista', parameters: { type: 'object' }, strict: false }]);
    assert.deepEqual(chamadas[0]['input'], [
        { role: 'user', content: 'liste' },
        { role: 'assistant', content: 'vou listar' },
        { type: 'function_call', call_id: 'call_0', name: 'listar', arguments: '{"limite":1}' },
        { type: 'function_call_output', call_id: 'call_0', output: '[]' },
        { type: 'function_call_output', call_id: 'call_9', output: 'Erro: falhou' },
    ]);
    assert.equal(devolvida.motivoParada, 'uso_ferramenta', 'resposta sem texto mas com ferramentas');
    assert.equal(devolvida.texto, '');
    assert.deepEqual(devolvida.blocos, [{ tipo: 'uso_ferramenta', id: 'call_1', nome: 'listar', entrada: { limite: 3 } }]);
});

test('Responses API: argumentos com JSON quebrado viram entrada vazia', async () => {
    const resposta: RespostaRespostasOpenAi = { model: 'gpt-6', status: 'completed', output: [{ type: 'function_call', call_id: 'c', name: 'x', arguments: '{quebrado' }] };
    const devolvida = await new OpenAiProvedor(clienteFalso({ resposta }).cliente).gerar(SOL);
    assert.deepEqual(devolvida.blocos, [{ tipo: 'uso_ferramenta', id: 'c', nome: 'x', entrada: {} }]);
});

test('Responses API: motivos de parada — incompleta por limite de tokens, outra incompleta e falha', async () => {
    const com = (parcial: Partial<RespostaRespostasOpenAi>): RespostaRespostasOpenAi => ({ model: 'gpt-6', output: [{ type: 'message', content: [{ type: 'output_text', text: 'x' }] }], ...parcial });
    const provedor = (resposta: RespostaRespostasOpenAi) => new OpenAiProvedor(clienteFalso({ resposta }).cliente);
    assert.equal((await provedor(com({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } })).gerar(SOL)).motivoParada, 'limite_de_tokens');
    assert.equal((await provedor(com({ status: 'incomplete', incomplete_details: { reason: 'content_filter' } })).gerar(SOL)).motivoParada, 'outro');
    await assert.rejects(() => provedor(com({ status: 'failed', error: { code: 'server_error' } })).gerar(SOL), (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL');
    await assert.rejects(() => provedor(com({ status: 'failed', error: { code: 'rate_limit_exceeded' } })).gerar(SOL), (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE');
});

test('Responses API: transmitir entrega os trechos de texto, junta as chamadas de função dos itens e usa o uso do evento final', async () => {
    const { cliente, chamadas } = clienteFalso({
        eventos: [
            { type: 'response.created' },
            { type: 'response.output_text.delta', delta: 'olá ' },
            { type: 'response.output_text.delta', delta: 'sol' },
            { type: 'response.output_item.done', item: { type: 'function_call', call_id: 'call_1', name: 'listar', arguments: '{"limite":3}' } },
            {
                type: 'response.completed',
                response: { model: 'gpt-6.1-sol-2026-10-01', status: 'completed', output: [], usage: { input_tokens: 9, output_tokens: 3, input_tokens_details: { cached_tokens: 4 } } },
            },
        ],
    });
    const trechos: string[] = [];
    const resposta = await new OpenAiProvedor(cliente).transmitir(SOL, (trecho) => trechos.push(trecho));

    assert.equal(chamadas[0]['stream'], true);
    assert.deepEqual(trechos, ['olá ', 'sol']);
    assert.equal(resposta.texto, 'olá sol');
    assert.equal(resposta.modelo, 'gpt-6.1-sol-2026-10-01');
    assert.deepEqual(resposta.blocos, [
        { tipo: 'texto', texto: 'olá sol' },
        { tipo: 'uso_ferramenta', id: 'call_1', nome: 'listar', entrada: { limite: 3 } },
    ]);
    assert.deepEqual(resposta.tokens, { entrada: 5, saida: 3, cache: 4 });
    assert.equal(resposta.motivoParada, 'uso_ferramenta');
});

test('Responses API: a chamada de função que só vem no evento final não se perde nem se repete', async () => {
    const chamada = { type: 'function_call', call_id: 'call_1', name: 'listar', arguments: '{}' };
    const comItem = clienteFalso({
        eventos: [{ type: 'response.output_item.done', item: chamada }, { type: 'response.completed', response: { status: 'completed', output: [chamada] } }],
    });
    assert.equal((await new OpenAiProvedor(comItem.cliente).transmitir(SOL, () => undefined)).blocos.length, 1, 'item e evento final trazem a mesma chamada: uma só');

    const soNoFinal = clienteFalso({ eventos: [{ type: 'response.completed', response: { status: 'completed', output: [chamada] } }] });
    assert.equal((await new OpenAiProvedor(soNoFinal.cliente).transmitir(SOL, () => undefined)).blocos.length, 1);
});

test('Responses API: fluxo cortado (sem evento final) ou com evento de falha é erro, nunca resposta parcial', async () => {
    const cortado = clienteFalso({ eventos: [{ type: 'response.output_text.delta', delta: 'meio' }] });
    await assert.rejects(() => new OpenAiProvedor(cortado.cliente).transmitir(SOL, () => undefined), (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL');

    const falhou = clienteFalso({ eventos: [{ type: 'response.failed', response: { error: { code: 'model_not_found' } } }] });
    await assert.rejects(() => new OpenAiProvedor(falhou.cliente).transmitir(SOL, () => undefined), (erro: unknown) => erro instanceof IaException && erro.motivo === 'CONFIGURACAO');

    const erroDoFluxo = clienteFalso({ eventos: [{ type: 'error', code: 'rate_limit_exceeded' }] });
    await assert.rejects(() => new OpenAiProvedor(erroDoFluxo.cliente).transmitir(SOL, () => undefined), (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE');
});

test('Responses API: erros do SDK viram IaException pelo status; pesquisaWeb continua ignorado', async () => {
    const tentar = (erro: unknown) => new OpenAiProvedor(clienteFalso({ erro }).cliente).gerar(SOL).catch((falha: unknown) => falha);
    assert.equal(((await tentar({ status: 429 })) as IaException).motivo, 'LIMITE');
    assert.equal(((await tentar({ status: 404 })) as IaException).motivo, 'CONFIGURACAO');
    assert.equal(((await tentar(new Error('rede'))) as IaException).motivo, 'INDISPONIVEL');

    const { cliente, chamadas } = clienteFalso();
    await new OpenAiProvedor(cliente).gerar({ ...SOL, pesquisaWeb: true });
    assert.equal(chamadas[0]['tools'], undefined);
});

// Listagem de modelos (spec 309).

test('listarModelos junta as páginas e fica só com os de texto: sem embeddings, voz, imagem, moderação, nem os já desligados', async () => {
    const { cliente } = clienteFalso({
        modelos: [
            [{ id: 'gpt-5', created: 1_760_000_000 }, { id: 'text-embedding-3-large', created: 1_700_000_000 }, { id: 'whisper-1', created: 1_600_000_000 }],
            [
                { id: 'gpt-6.1-sol', created: 1_790_000_000 },
                { id: 'gpt-image-1', created: 1_780_000_000 },
                { id: 'omni-moderation-latest', created: 1_770_000_000 },
                { id: 'gpt-4-velho', created: 1_500_000_000, shutdown_date: '2020-01-01' },
                { id: 'o3', created: 1_750_000_000 },
            ],
        ],
    });
    const modelos = await new OpenAiProvedor(cliente).listarModelos();
    assert.deepEqual(modelos, [{ id: 'gpt-6.1-sol', nome: 'gpt-6.1-sol' }, { id: 'gpt-5', nome: 'gpt-5' }, { id: 'o3', nome: 'o3' }]);
});

test('listarModelos: lista vazia devolve vazia e erro do SDK sobe como veio', async () => {
    assert.deepEqual(await new OpenAiProvedor(clienteFalso({ modelos: [] }).cliente).listarModelos(), []);
    const falha = { status: 429 };
    await assert.rejects(() => new OpenAiProvedor(clienteFalso({ erroNaListagem: falha }).cliente).listarModelos(), (erro: unknown) => erro === falha);
});
