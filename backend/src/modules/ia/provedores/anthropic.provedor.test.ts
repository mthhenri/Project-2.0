import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { AnthropicProvedor, ClienteAnthropic, MensagemAnthropic } from './anthropic.provedor';

const SOLICITACAO: IaSolicitacaoProvedor = {
  modelo: 'modelo-x',
  maximoTokens: 500,
  instrucoes: 'Seja breve.',
  mensagens: [{ papel: 'usuario', conteudo: 'oi' }],
};

const MENSAGEM: MensagemAnthropic = {
  model: 'modelo-x',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'olá ' }, { type: 'text', text: 'mundo' }],
  usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 7 },
};

function clienteFalso(opcoes: { mensagem?: MensagemAnthropic; trechos?: string[]; erro?: unknown } = {}) {
  const chamadas: Record<string, unknown>[] = [];
  const cliente: ClienteAnthropic = {
    messages: {
      async create(parametros) {
        chamadas.push(parametros);
        if (opcoes.erro) throw opcoes.erro;
        return opcoes.mensagem ?? MENSAGEM;
      },
      stream(parametros) {
        chamadas.push(parametros);
        const ouvintes: Array<(trecho: string) => void> = [];
        return {
          on(_evento, ouvinte) {
            ouvintes.push(ouvinte);
            return undefined;
          },
          async finalMessage() {
            if (opcoes.erro) throw opcoes.erro;
            for (const trecho of opcoes.trechos ?? ['olá ', 'mundo']) ouvintes.forEach((ouvinte) => ouvinte(trecho));
            return opcoes.mensagem ?? MENSAGEM;
          },
        };
      },
    },
  };
  return { cliente, chamadas };
}

test('gerar monta os parâmetros e devolve texto, modelo, tokens (com cache) e motivo de parada', async () => {
  const { cliente, chamadas } = clienteFalso();
  const resposta = await new AnthropicProvedor(cliente).gerar(SOLICITACAO);

  assert.deepEqual(chamadas[0], {
    model: 'modelo-x',
    max_tokens: 500,
    system: 'Seja breve.',
    messages: [{ role: 'user', content: 'oi' }],
  });
  assert.equal(resposta.texto, 'olá mundo');
  assert.equal(resposta.modelo, 'modelo-x');
  assert.deepEqual(resposta.tokens, { entrada: 10, saida: 4, cache: 7 });
  assert.equal(resposta.motivoParada, 'fim');
});

test('esforço neutro vira output_config.effort; sem esforço o campo não vai', async () => {
  const { cliente, chamadas } = clienteFalso();
  const provedor = new AnthropicProvedor(cliente);
  await provedor.gerar({ ...SOLICITACAO, esforco: EsforcoIaEnum.ALTO });
  await provedor.gerar(SOLICITACAO);
  assert.deepEqual(chamadas[0]['output_config'], { effort: 'high' });
  assert.equal('output_config' in chamadas[1], false);
});

test('ferramentas e blocos de ferramenta são repassados nos dois sentidos', async () => {
  const mensagem: MensagemAnthropic = {
    model: 'modelo-x',
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'uso-1', name: 'listar', input: { filtro: 'x' } }],
  };
  const { cliente, chamadas } = clienteFalso({ mensagem });
  const resposta = await new AnthropicProvedor(cliente).gerar({
    ...SOLICITACAO,
    ferramentas: [{ nome: 'listar', descricao: 'Lista coisas', esquemaEntrada: { type: 'object' } }],
    mensagens: [
      { papel: 'usuario', conteudo: 'liste' },
      { papel: 'ia', conteudo: [{ tipo: 'uso_ferramenta', id: 'uso-0', nome: 'listar', entrada: {} }] },
      { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'uso-0', conteudo: 'ok' }] },
    ],
  });

  assert.deepEqual(chamadas[0]['tools'], [{ name: 'listar', description: 'Lista coisas', input_schema: { type: 'object' } }]);
  assert.deepEqual((chamadas[0]['messages'] as unknown[])[1], {
    role: 'assistant',
    content: [{ type: 'tool_use', id: 'uso-0', name: 'listar', input: {} }],
  });
  assert.deepEqual((chamadas[0]['messages'] as unknown[])[2], {
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: 'uso-0', content: 'ok', is_error: false }],
  });
  assert.deepEqual(resposta.blocos, [{ tipo: 'uso_ferramenta', id: 'uso-1', nome: 'listar', entrada: { filtro: 'x' } }]);
  assert.equal(resposta.motivoParada, 'uso_ferramenta');
});

test('transmitir entrega os trechos na ordem, antes do fim, e devolve a resposta completa', async () => {
  const { cliente } = clienteFalso({ trechos: ['a', 'b', 'c'] });
  const recebidos: string[] = [];
  const resposta = await new AnthropicProvedor(cliente).transmitir(SOLICITACAO, (trecho) => recebidos.push(trecho));
  assert.deepEqual(recebidos, ['a', 'b', 'c']);
  assert.equal(resposta.texto, 'olá mundo');
});

test('erros do SDK viram IaException pelo status, nunca o erro cru', async () => {
  const casos: Array<[number | undefined, string]> = [
    [429, 'LIMITE'],
    [401, 'CONFIGURACAO'],
    [404, 'CONFIGURACAO'],
    [500, 'INDISPONIVEL'],
    [undefined, 'INDISPONIVEL'],
  ];
  for (const [status, motivo] of casos) {
    const { cliente } = clienteFalso({ erro: Object.assign(new Error('cru do SDK'), { status }) });
    await assert.rejects(
      () => new AnthropicProvedor(cliente).gerar(SOLICITACAO),
      (erro: unknown) => erro instanceof IaException && erro.motivo === motivo && !erro.mensagem.includes('cru do SDK'),
    );
    await assert.rejects(() => new AnthropicProvedor(cliente).transmitir(SOLICITACAO, () => undefined), IaException);
  }
});

test('sem chave (sem cliente) o provedor fica indisponível e recusa com IaException', async () => {
  const provedor = new AnthropicProvedor(null);
  assert.equal(provedor.estaDisponivel(), false);
  await assert.rejects(
    () => provedor.gerar(SOLICITACAO),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL' && erro.mensagem === 'IA indisponível neste ambiente',
  );
});
