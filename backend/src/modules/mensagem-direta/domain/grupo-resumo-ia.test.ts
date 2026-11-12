import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { LINHA_DE_RESUMO_POR_IA, MAXIMO_DE_CHAMADAS_POR_RESUMO, TRECHO_DE_CODIGO_OMITIDO } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
    dividirEmBlocos,
    estimarResumo,
    estimarTokens,
    fecharTextoDoResumo,
    lerPeriodoDoResumo,
    montarBlocoDaDocumentacao,
    montarEntradaDoFechamento,
    omitirCodigo,
    prepararMensagens,
    rotuloDoPeriodo,
} from './grupo-resumo-ia';

const CERCADO = 'olha isso:\n```ts\nconst segredo = 1;\n```\ne pronto';

test('o código cercado vira o marcador e o resto do texto fica', () => {
    const { texto, omitidos } = omitirCodigo(CERCADO);
    assert.equal(omitidos, 1);
    assert.ok(texto.includes(TRECHO_DE_CODIGO_OMITIDO));
    assert.ok(!texto.includes('segredo'));
    assert.ok(texto.includes('olha isso') && texto.includes('e pronto'));
});

test('vários blocos e bloco sem fechamento são omitidos; código em linha não conta', () => {
    assert.ok(omitirCodigo('```a```\n\n```\nb\n```').omitidos >= 1);
    const semFechar = omitirCodigo('antes\n```js\nvazou = true');
    assert.ok(!semFechar.texto.includes('vazou'));
    assert.deepEqual(omitirCodigo('use `npm i` aqui'), { texto: 'use `npm i` aqui', omitidos: 0 });
});

test('as mensagens preparadas não levam o nome do autor e sem código nenhum bloco sai', () => {
    const preparadas = prepararMensagens([{ texto: CERCADO, createdDate: new Date('2026-11-01T15:00:00Z') }, { texto: 'ok', createdDate: new Date('2026-11-01T15:05:00Z') }], false);
    assert.equal(preparadas.blocosDeCodigoOmitidos, 1);
    assert.equal(preparadas.linhas.length, 2);
    assert.ok(preparadas.linhas.every((linha) => /^\(\d{2}\/\d{2} \d{2}:\d{2}\) /.test(linha)));
    assert.ok(!preparadas.linhas.join('').includes('segredo'));
    const comCodigo = prepararMensagens([{ texto: CERCADO, createdDate: new Date('2026-11-01T15:00:00Z') }], true);
    assert.ok(comCodigo.linhas[0].includes('segredo'));
    assert.equal(comCodigo.blocosDeCodigoOmitidos, 0);
});

test('dividir em blocos cobre todas as mensagens, na ordem, sem perder nenhuma', () => {
    const linhas = Array.from({ length: 50 }, (_, indice) => `(01/11 10:${String(indice).padStart(2, '0')}) mensagem número ${indice} ${'x'.repeat(40)}`);
    const blocos = dividirEmBlocos(linhas, 500);
    assert.ok(blocos.length > 1);
    assert.ok(blocos.every((bloco) => bloco.length <= 500));
    assert.equal(blocos.join('\n'), linhas.join('\n'), 'a união dos blocos é exatamente o conjunto de mensagens, na ordem');
});

test('uma mensagem maior que o limite é partida e continua inteira', () => {
    const grande = 'a'.repeat(1050);
    const blocos = dividirEmBlocos([grande, 'fim'], 500);
    assert.equal(blocos.join('').replace(/\n/g, ''), `${grande}fim`);
    assert.ok(blocos.every((bloco) => bloco.length <= 500));
});

test('sem mensagens não há bloco, e a estimativa é zero chamadas', () => {
    assert.deepEqual(dividirEmBlocos([]), []);
    const estimativa = estimarResumo([], null);
    assert.equal(estimativa.quantidadeChamadas, 0);
    assert.equal(estimativa.acimaDoTeto, false);
});

test('um bloco é uma chamada; vários são uma por bloco mais o fechamento; o custo usa o preço e some sem ele', () => {
    const um = estimarResumo(['x'.repeat(4000)], { modelo: 'm', precoEntradaMilhao: 1, precoSaidaMilhao: 5, precoCacheMilhao: 0 });
    assert.equal(um.quantidadeChamadas, 1);
    assert.ok(um.tokensEntradaEstimados >= estimarTokens('x'.repeat(4000)));
    assert.ok((um.custoEstimadoDolar ?? 0) > 0);
    const varios = estimarResumo(['a', 'b', 'c'], null);
    assert.equal(varios.quantidadeChamadas, 4);
    assert.equal(varios.custoEstimadoDolar, null);
});

test('passar do teto de chamadas é marcado', () => {
    const muitos = Array.from({ length: MAXIMO_DE_CHAMADAS_POR_RESUMO }, () => 'x');
    assert.equal(estimarResumo(muitos, null).acimaDoTeto, true);
    assert.equal(estimarResumo(muitos.slice(1), null).acimaDoTeto, false);
});

test('o texto final termina com a linha de IA, uma só vez', () => {
    const final = fecharTextoDoResumo('- decidiram X');
    assert.ok(final.endsWith(LINHA_DE_RESUMO_POR_IA));
    const repetido = fecharTextoDoResumo(`- decidiram X\n\n${LINHA_DE_RESUMO_POR_IA}`);
    assert.equal(repetido.split(LINHA_DE_RESUMO_POR_IA).length - 1, 1);
});

test('o fechamento recebe os resumos parciais em ordem', () => {
    const entrada = montarEntradaDoFechamento(['- um', '- dois']);
    assert.ok(entrada.indexOf('Resumo parcial 1') < entrada.indexOf('- um'));
    assert.ok(entrada.indexOf('- um') < entrada.indexOf('Resumo parcial 2'));
});

test('o bloco da documentação leva o período, a data de hoje e o texto; o período de um dia só aparece uma vez', () => {
    const bloco = montarBlocoDaDocumentacao('- ok', new Date('2026-11-01T15:00:00Z'), new Date('2026-11-12T15:00:00Z'), new Date('2026-11-12T18:00:00Z'));
    assert.ok(bloco.startsWith('## Resumo do chat (01/11/2026 a 12/11/2026)'));
    assert.ok(bloco.includes('Gravado em 12/11/2026') && bloco.endsWith('- ok'));
    assert.equal(rotuloDoPeriodo(new Date('2026-11-01T13:00:00Z'), new Date('2026-11-01T20:00:00Z')), '01/11/2026');
});

test('o período recusa datas inválidas e fim antes do início, e corta o fim no agora', () => {
    const agora = new Date('2026-11-12T12:00:00Z');
    assert.throws(() => lerPeriodoDoResumo('x', '2026-11-12T00:00:00Z', agora), BusinessException);
    assert.throws(() => lerPeriodoDoResumo('2026-11-12T00:00:00Z', '2026-11-01T00:00:00Z', agora), BusinessException);
    const periodo = lerPeriodoDoResumo('2026-11-01T00:00:00Z', '2027-01-01T00:00:00Z', agora);
    assert.equal(periodo.fim.getTime(), agora.getTime());
});
