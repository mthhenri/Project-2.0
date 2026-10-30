import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { ClienteGoogle, GoogleProvedor, RespostaGoogle } from './google.provedor';

const SOLICITACAO: IaSolicitacaoProvedor = {
  modelo: 'gemini-2.5-flash',
  maximoTokens: 500,
  instrucoes: 'Seja breve.',
  mensagens: [{ papel: 'usuario', conteudo: 'oi' }],
};

const RESPOSTA: RespostaGoogle = {
  modelVersion: 'gemini-2.5-flash-001',
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'olá ' }, { text: 'mundo' }] } }],
  usageMetadata: { promptTokenCount: 17, candidatesTokenCount: 3, thoughtsTokenCount: 1, cachedContentTokenCount: 7 },
};

function clienteFalso(opcoes: { resposta?: RespostaGoogle; trechos?: RespostaGoogle[]; erro?: unknown } = {}) {
  const chamadas: Record<string, unknown>[] = [];
  const cliente: ClienteGoogle = {
    async gerar(parametros) {
      chamadas.push(parametros);
      if (opcoes.erro) throw opcoes.erro;
      return opcoes.resposta ?? RESPOSTA;
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

test('gerar monta os parâmetros (papel model, instruções na config) e devolve texto, modelo, tokens (raciocínio como saída, sem cache duplicado) e motivo', async () => {
  const { cliente, chamadas } = clienteFalso();
  const resposta = await new GoogleProvedor(cliente).gerar({
    ...SOLICITACAO,
    mensagens: [{ papel: 'usuario', conteudo: 'oi' }, { papel: 'ia', conteudo: 'olá' }, { papel: 'usuario', conteudo: 'e aí' }],
  });

  assert.deepEqual(chamadas[0], {
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: 'oi' }] },
      { role: 'model', parts: [{ text: 'olá' }] },
      { role: 'user', parts: [{ text: 'e aí' }] },
    ],
    config: { maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 }, systemInstruction: 'Seja breve.' },
  });
  assert.equal(resposta.texto, 'olá mundo');
  assert.equal(resposta.modelo, 'gemini-2.5-flash-001');
  assert.deepEqual(resposta.tokens, { entrada: 10, saida: 4, cache: 7 });
  assert.equal(resposta.motivoParada, 'fim');
});

test('pensamento do modelo nunca entra no texto', async () => {
  const resposta = await new GoogleProvedor(
    clienteFalso({ resposta: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'pensando...', thought: true }, { text: 'resposta' }] } }] } }).cliente,
  ).gerar(SOLICITACAO);
  assert.equal(resposta.texto, 'resposta');
});

test('ferramentas: declarações, chamada com assinatura de pensamento devolvida, e resultado casado pelo nome', async () => {
  const resposta = await new GoogleProvedor(
    clienteFalso({
      resposta: {
        candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { id: 'f1', name: 'listar', args: { limite: 3 } }, thoughtSignature: 'assinatura-1' }] } }],
      },
    }).cliente,
  ).gerar(SOLICITACAO);
  assert.equal(resposta.motivoParada, 'uso_ferramenta');
  assert.deepEqual(resposta.blocos, [{ tipo: 'uso_ferramenta', id: 'f1', nome: 'listar', entrada: { limite: 3 }, assinatura: 'assinatura-1' }]);

  const { cliente, chamadas } = clienteFalso();
  await new GoogleProvedor(cliente).gerar({
    ...SOLICITACAO,
    ferramentas: [{ nome: 'listar', descricao: 'Lista', esquemaEntrada: { type: 'object' } }],
    mensagens: [
      { papel: 'usuario', conteudo: 'liste' },
      { papel: 'ia', conteudo: resposta.blocos },
      { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'f1', conteudo: '[]' }] },
    ],
  });
  assert.deepEqual((chamadas[0]['config'] as Record<string, unknown>)['tools'], [
    { functionDeclarations: [{ name: 'listar', description: 'Lista', parametersJsonSchema: { type: 'object' } }] },
  ]);
  assert.deepEqual((chamadas[0]['contents'] as unknown[]).slice(1), [
    { role: 'model', parts: [{ functionCall: { id: 'f1', name: 'listar', args: { limite: 3 } }, thoughtSignature: 'assinatura-1' }] },
    { role: 'user', parts: [{ functionResponse: { id: 'f1', name: 'listar', response: { output: '[]' } } }] },
  ]);
});

test('chamada sem id ganha um id do projeto, que não volta ao Gemini; resultado com erro vai em error', async () => {
  const resposta = await new GoogleProvedor(
    clienteFalso({ resposta: { candidates: [{ content: { parts: [{ functionCall: { name: 'a', args: {} } }, { functionCall: { name: 'b' } }] } }] } }).cliente,
  ).gerar(SOLICITACAO);
  const [primeira, segunda] = resposta.blocos;
  assert.ok(primeira.tipo === 'uso_ferramenta' && segunda.tipo === 'uso_ferramenta');
  assert.notEqual(primeira.id, segunda.id);

  const { cliente, chamadas } = clienteFalso();
  await new GoogleProvedor(cliente).gerar({
    ...SOLICITACAO,
    mensagens: [
      { papel: 'ia', conteudo: [primeira] },
      { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: primeira.id, conteudo: 'quebrou', erro: true }] },
    ],
  });
  assert.deepEqual(chamadas[0]['contents'], [
    { role: 'model', parts: [{ functionCall: { name: 'a', args: {} } }] },
    { role: 'user', parts: [{ functionResponse: { name: 'a', response: { error: 'quebrou' } } }] },
  ]);
});

test('o id do projeto cabe nos 40 caracteres que a OpenAI aceita em tool_call_id', async () => {
  const resposta = await new GoogleProvedor(clienteFalso({ resposta: { candidates: [{ content: { parts: [{ functionCall: { name: 'a' } }] } }] } }).cliente).gerar(SOLICITACAO);
  const bloco = resposta.blocos[0];
  assert.ok(bloco.tipo === 'uso_ferramenta');
  assert.ok(bloco.id.length <= 40, `id com ${bloco.id.length} caracteres`);
});

test('pensamento: sem esforço o modelo de raciocínio pensa o mínimo (com folga no teto quando não desliga); com esforço fica no padrão; modelo sem raciocínio não recebe nada', async () => {
  const { cliente, chamadas } = clienteFalso();
  const provedor = new GoogleProvedor(cliente);
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gemini-2.5-flash', maximoTokens: 10 });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gemini-2.5-pro', maximoTokens: 10 });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gemini-3-flash-preview', maximoTokens: 10 });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gemini-2.5-pro', maximoTokens: 10, esforco: EsforcoIaEnum.ALTO });
  await provedor.gerar({ ...SOLICITACAO, modelo: 'gemini-2.0-flash', maximoTokens: 10 });

  const configuracao = (indice: number) => chamadas[indice]['config'] as Record<string, unknown>;
  assert.deepEqual([configuracao(0)['thinkingConfig'], configuracao(0)['maxOutputTokens']], [{ thinkingBudget: 0 }, 10]);
  assert.deepEqual([configuracao(1)['thinkingConfig'], configuracao(1)['maxOutputTokens']], [{ thinkingBudget: 128 }, 138]);
  assert.deepEqual([configuracao(2)['thinkingConfig'], configuracao(2)['maxOutputTokens']], [{ thinkingLevel: 'low' }, 1034]);
  assert.deepEqual(['thinkingConfig' in configuracao(3), configuracao(3)['maxOutputTokens']], [false, 10]);
  assert.deepEqual(['thinkingConfig' in configuracao(4), configuracao(4)['maxOutputTokens']], [false, 10]);
});

test('duas voltas de ferramenta sem id do Gemini recebem ids diferentes (o chat reenvia as voltas do dia)', async () => {
  const volta = (nome: string): RespostaGoogle => ({ candidates: [{ content: { parts: [{ functionCall: { name: nome } }] } }] });
  const provedor = new GoogleProvedor(clienteFalso({ resposta: volta('listar') }).cliente);
  const primeira = (await provedor.gerar(SOLICITACAO)).blocos[0];
  const segunda = (await new GoogleProvedor(clienteFalso({ resposta: volta('buscar') }).cliente).gerar(SOLICITACAO)).blocos[0];
  assert.ok(primeira.tipo === 'uso_ferramenta' && segunda.tipo === 'uso_ferramenta');
  assert.notEqual(primeira.id, segunda.id);

  const { cliente, chamadas } = clienteFalso();
  await new GoogleProvedor(cliente).gerar({
    ...SOLICITACAO,
    mensagens: [
      { papel: 'ia', conteudo: [primeira] },
      { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: primeira.id, conteudo: 'a' }] },
      { papel: 'ia', conteudo: [segunda] },
      { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: segunda.id, conteudo: 'b' }] },
    ],
  });
  const respostas = (chamadas[0]['contents'] as Array<{ parts: Array<{ functionResponse?: { name: string } }> }>).filter((c) => c.parts[0].functionResponse);
  assert.deepEqual(respostas.map((c) => c.parts[0].functionResponse?.name), ['listar', 'buscar'], 'cada resultado volta com o nome da sua própria chamada');
});

test('transmitir entrega só os trechos de texto e junta tudo na resposta, com o uso do último pedaço', async () => {
  const { cliente } = clienteFalso({
    trechos: [
      { candidates: [{ content: { parts: [{ text: 'olá ' }] } }] },
      { candidates: [{ content: { parts: [{ text: 'sem mostrar', thought: true }, { text: 'mundo' }] } }] },
      { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }], usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 3 } },
    ],
  });
  const trechos: string[] = [];
  const resposta = await new GoogleProvedor(cliente).transmitir(SOLICITACAO, (trecho) => trechos.push(trecho));

  assert.deepEqual(trechos, ['olá ', 'mundo']);
  assert.equal(resposta.texto, 'olá mundo');
  assert.deepEqual(resposta.tokens, { entrada: 9, saida: 3, cache: 0 });
  assert.equal(resposta.motivoParada, 'limite_de_tokens');
});

test('resposta sem candidato (bloqueada) devolve texto vazio e motivo outro', async () => {
  const resposta = await new GoogleProvedor(clienteFalso({ resposta: {} }).cliente).gerar(SOLICITACAO);
  assert.equal(resposta.texto, '');
  assert.equal(resposta.motivoParada, 'outro');
});

test('sem cliente (sem chave) o provedor está indisponível e recusa a chamada', async () => {
  const provedor = new GoogleProvedor(null);
  assert.equal(provedor.estaDisponivel(), false);
  await assert.rejects(() => provedor.gerar(SOLICITACAO), (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL');
  await assert.rejects(() => provedor.transmitir(SOLICITACAO, () => undefined), IaException);
});

test('erros do SDK viram IaException pelo status, nunca o erro cru', async () => {
  const tentar = (erro: unknown) => new GoogleProvedor(clienteFalso({ erro }).cliente).gerar(SOLICITACAO).catch((falha: unknown) => falha);
  assert.equal(((await tentar({ status: 429 })) as IaException).motivo, 'LIMITE');
  assert.equal(((await tentar({ status: 403 })) as IaException).motivo, 'CONFIGURACAO');
  assert.equal(((await tentar({ status: 500 })) as IaException).motivo, 'INDISPONIVEL');
});

test('pesquisaWeb: sem ferramentas do projeto liga o Google Search em qualquer modelo', async () => {
  const { cliente, chamadas } = clienteFalso();
  await new GoogleProvedor(cliente).gerar({ ...SOLICITACAO, pesquisaWeb: true });
  const config = (chamadas[0]['config'] as Record<string, unknown>);
  assert.deepEqual(config['tools'], [{ googleSearch: {} }]);
  assert.equal(config['toolConfig'], undefined);
});

test('pesquisaWeb com ferramentas do projeto: só a série 3 mistura (e pede as chamadas do servidor); a 2.5 segue só com as ferramentas', async () => {
  const ferramenta = { nome: 'listar', descricao: 'Lista.', esquemaEntrada: { type: 'object' } };

  const gemini3 = clienteFalso();
  await new GoogleProvedor(gemini3.cliente).gerar({ ...SOLICITACAO, modelo: 'gemini-3-pro', ferramentas: [ferramenta], pesquisaWeb: true });
  const config3 = gemini3.chamadas[0]['config'] as Record<string, unknown>;
  assert.equal((config3['tools'] as unknown[]).length, 2);
  assert.deepEqual((config3['tools'] as unknown[])[1], { googleSearch: {} });
  assert.deepEqual(config3['toolConfig'], { includeServerSideToolInvocations: true });

  const gemini25 = clienteFalso();
  await new GoogleProvedor(gemini25.cliente).gerar({ ...SOLICITACAO, ferramentas: [ferramenta], pesquisaWeb: true });
  const config25 = gemini25.chamadas[0]['config'] as Record<string, unknown>;
  assert.equal((config25['tools'] as unknown[]).length, 1);
  assert.equal(config25['toolConfig'], undefined);
});
