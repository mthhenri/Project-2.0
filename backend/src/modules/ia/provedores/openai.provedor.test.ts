import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { ClienteOpenAi, CompletudeOpenAi, OpenAiProvedor, TrechoOpenAi } from './openai.provedor';

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

function clienteFalso(opcoes: { completude?: CompletudeOpenAi; trechos?: TrechoOpenAi[]; erro?: unknown } = {}) {
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

test('teto: o modelo de raciocínio sem esforço ganha folga para o pensamento; com esforço ou sem raciocínio o teto é o pedido', async () => {
  const { cliente, chamadas } = clienteFalso();
  const provedor = new OpenAiProvedor(cliente);
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-5-mini', maximoTokens: 10 });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-5', maximoTokens: 10, esforco: EsforcoIaEnum.ALTO });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gpt-4.1', maximoTokens: 10 });

  assert.deepEqual(chamadas.map((chamada) => chamada['max_completion_tokens']), [1034, 10, 10]);
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
  const comMotivo = (finish_reason: string): CompletudeOpenAi => ({ model: 'm', choices: [{ finish_reason, message: { content: 'x' } }] });
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
