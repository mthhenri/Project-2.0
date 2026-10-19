import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { of, lastValueFrom } from 'rxjs';
import { StreamableFile, ExecutionContext, CallHandler } from '@nestjs/common';
import { ResponseFormatInterceptor } from './response-format.interceptor';

async function interceptar(retorno: unknown): Promise<unknown> {
  const manipulador: CallHandler = { handle: () => of(retorno) };
  const resultado = new ResponseFormatInterceptor().intercept({} as ExecutionContext, manipulador);
  return lastValueFrom(resultado);
}

test('embrulha o dado de retorno em StandardResponse de sucesso', async () => {
  const resposta = await interceptar({ id: 1, nome: 'Backend' });
  assert.deepEqual(resposta, { sucesso: true, dados: { id: 1, nome: 'Backend' }, mensagem: 'Operação realizada com sucesso' });
});

test('retorno vazio (void/null) vira dados nulos ou indefinidos com sucesso', async () => {
  for (const vazio of [undefined, null]) {
    const resposta = (await interceptar(vazio)) as any;
    assert.equal(resposta.sucesso, true);
    assert.equal(resposta.dados ?? null, null);
  }
});

test('lista e valor primitivo também são embrulhados', async () => {
  assert.deepEqual(((await interceptar([1, 2])) as any).dados, [1, 2]);
  assert.equal(((await interceptar(7)) as any).dados, 7);
});

test('resposta já padronizada (com "sucesso") não é embrulhada de novo', async () => {
  const pronta = { sucesso: false, dados: null, mensagem: 'x', erros: [] };
  assert.equal(await interceptar(pronta), pronta);
});

test('download de arquivo (StreamableFile) passa direto', async () => {
  const arquivo = new StreamableFile(Buffer.from('conteúdo'));
  assert.equal(await interceptar(arquivo), arquivo);
});
