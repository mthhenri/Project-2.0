import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
    BOTAO_PADRAO_DO_AVISO_NATIVO, BOTOES_DO_AVISO_NATIVO, ENDERECO_DE_CONTINUAR, ENDERECO_DE_SAIR, montarPaginaDoDialogoDeSaida, respostaDaNavegacao, respostaDoAvisoNativo,
} from './dialogo-de-saida';

test('cada botão do aviso vira uma resposta; outra navegação é ignorada', () => {
    assert.equal(respostaDaNavegacao(ENDERECO_DE_SAIR), 'sair');
    assert.equal(respostaDaNavegacao(ENDERECO_DE_CONTINUAR), 'continuar');
    assert.equal(respostaDaNavegacao('https://exemplo.com/'), null);
    assert.equal(respostaDaNavegacao('data:text/html,x'), null);
});

test('a página traz os dois botões e o texto de que o check-in é desativado', () => {
    const pagina = montarPaginaDoDialogoDeSaida('Project Desktop');
    assert.match(pagina, /Fechar completamente/);
    assert.match(pagina, /Continuar usando/);
    assert.match(pagina, /desativa o check-in/);
    assert.match(pagina, /prefers-color-scheme: dark/);
    assert.ok(pagina.includes(ENDERECO_DE_SAIR) && pagina.includes(ENDERECO_DE_CONTINUAR));
});

test('no diálogo nativo só o botão de sair sai; Enter e Esc continuam', () => {
    assert.equal(respostaDoAvisoNativo(BOTOES_DO_AVISO_NATIVO.indexOf('Fechar completamente')), 'sair');
    assert.equal(respostaDoAvisoNativo(BOTOES_DO_AVISO_NATIVO.indexOf('Continuar usando')), 'continuar');
    assert.equal(respostaDoAvisoNativo(BOTAO_PADRAO_DO_AVISO_NATIVO), 'continuar');
    assert.equal(respostaDoAvisoNativo(-1), 'continuar');
    assert.equal(respostaDoAvisoNativo(7), 'continuar');
});
