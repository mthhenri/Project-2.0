import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { BuscaWebBrave } from './busca-web';

type Resposta = { ok: boolean; status: number; json(): Promise<unknown> };

function criar(chave: string | undefined, responder: (url: string, cabecalhos: Record<string, string>) => Promise<Resposta>) {
  const configService = { obter: () => ({ buscaWeb: { chave } }) } as unknown as ConfigService;
  const pedidos: Array<{ url: string; cabecalhos: Record<string, string> }> = [];
  const busca = new (class extends BuscaWebBrave {
    protected requisitar(url: string, cabecalhos: Record<string, string>): Promise<Resposta> {
      pedidos.push({ url, cabecalhos });
      return responder(url, cabecalhos);
    }
  })(configService);
  return { busca, pedidos };
}

const ok = (corpo: unknown): Promise<Resposta> => Promise.resolve({ ok: true, status: 200, json: async () => corpo });

test('só está disponível com a chave configurada', () => {
  assert.equal(criar('abc', () => ok({})).busca.disponivel(), true);
  assert.equal(criar(undefined, () => ok({})).busca.disponivel(), false);
});

test('envia a consulta e o token e devolve título, url e trecho sem HTML', async () => {
  const { busca, pedidos } = criar('segredo', () =>
    ok({ web: { results: [{ title: 'Usar <strong>Map</strong> &amp; Set', url: 'https://exemplo.dev/map', description: 'O <strong>Map</strong> guarda pares &quot;chave/valor&quot;.' }] } }),
  );
  const resultados = await busca.buscar('javascript map vs object', 5);

  assert.deepEqual(resultados, [{ titulo: 'Usar Map & Set', url: 'https://exemplo.dev/map', trecho: 'O Map guarda pares "chave/valor".' }]);
  assert.equal(pedidos[0].cabecalhos['X-Subscription-Token'], 'segredo');
  const endereco = new URL(pedidos[0].url);
  assert.equal(endereco.searchParams.get('q'), 'javascript map vs object');
  assert.equal(endereco.searchParams.get('count'), '5');
});

test('ignora resultado sem título ou sem url, corta o trecho e respeita a quantidade', async () => {
  const { busca } = criar('x', () =>
    ok({ web: { results: [{ title: 'sem url' }, { url: 'https://a.dev' }, ...Array.from({ length: 8 }, (_, i) => ({ title: `T${i}`, url: `https://s.dev/${i}`, description: 'a'.repeat(900) }))] } }),
  );
  const resultados = await busca.buscar('algo', 3);
  assert.equal(resultados.length, 3);
  assert.equal(resultados[0].trecho.length, 400);
});

test('resposta sem resultados devolve lista vazia', async () => {
  assert.deepEqual(await criar('x', () => ok({})).busca.buscar('nada', 5), []);
});

test('sem chave, recusa com erro de negócio', async () => {
  await assert.rejects(criar(undefined, () => ok({})).busca.buscar('algo', 5), BusinessException);
});

const comMensagem = (trecho: RegExp) => (erro: unknown) => {
  assert.ok(erro instanceof BusinessException);
  assert.match((erro.getResponse() as { mensagem: string }).mensagem, trecho);
  return true;
};

test('recusa do serviço e falha de rede viram erro de negócio que o modelo lê', async () => {
  await assert.rejects(criar('x', () => Promise.resolve({ ok: false, status: 429, json: async () => ({}) })).busca.buscar('algo', 5), comMensagem(/HTTP 429/));
  await assert.rejects(criar('x', () => Promise.reject(new Error('timeout'))).busca.buscar('algo', 5), comMensagem(/não respondeu a tempo/));
});
