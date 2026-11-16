import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TooManyRequestsException } from '../../../core/exceptions/too-many-requests.exception';
import {
    ATRASO_BASE_EM_SEGUNDOS,
    ATRASO_MAXIMO_EM_SEGUNDOS,
    JANELA_DE_ESQUECIMENTO_EM_SEGUNDOS,
    LIMITE_DE_FALHAS_POR_IP,
    LIMITE_DE_FALHAS_POR_LOGIN,
    LimiteDeTentativasDeLogin,
} from './limite-de-tentativas-de-login';

// Limite de tentativas do login (task 421): por login e por IP, com atraso progressivo. O relógio é injetado.

function criar() {
    let agora = 1_000_000;
    const limite = new LimiteDeTentativasDeLogin(() => agora);
    return { limite, avancar: (segundos: number) => { agora += segundos * 1000; } };
}

const maria = { login: 'maria', ip: '10.0.0.1' };

function segundosDoBloqueio(limite: LimiteDeTentativasDeLogin, tentativa = maria): number | null {
    try {
        limite.verificar(tentativa);
        return null;
    } catch (erro) {
        if (erro instanceof TooManyRequestsException) return erro.segundosParaTentar;
        throw erro;
    }
}

test('até o limite de falhas por login ninguém é bloqueado; na falha seguinte o login fica bloqueado pelo atraso base', () => {
    const { limite } = criar();
    for (let tentativa = 1; tentativa < LIMITE_DE_FALHAS_POR_LOGIN; tentativa++) {
        limite.registrarFalha(maria);
        assert.equal(segundosDoBloqueio(limite), null, `falha ${tentativa}`);
    }
    limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite), ATRASO_BASE_EM_SEGUNDOS);
});

test('o bloqueio passa com o tempo e cada falha seguinte dobra o atraso, até o máximo', () => {
    const { limite, avancar } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_LOGIN; tentativa++) limite.registrarFalha(maria);
    avancar(ATRASO_BASE_EM_SEGUNDOS);
    assert.equal(segundosDoBloqueio(limite), null, 'o bloqueio acabou');

    limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite), ATRASO_BASE_EM_SEGUNDOS * 2);
    avancar(ATRASO_BASE_EM_SEGUNDOS * 2);
    limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite), ATRASO_BASE_EM_SEGUNDOS * 4);

    for (let repeticao = 0; repeticao < 12; repeticao++) {
        avancar(ATRASO_MAXIMO_EM_SEGUNDOS);
        limite.registrarFalha(maria);
    }
    assert.equal(segundosDoBloqueio(limite), ATRASO_MAXIMO_EM_SEGUNDOS, 'nunca passa do máximo');
});

test('login certo zera a contagem do login, mas não a do IP', () => {
    const { limite } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_LOGIN - 1; tentativa++) limite.registrarFalha(maria);
    limite.registrarSucesso(maria);
    limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite), null, 'recomeçou do zero');

    const { limite: doIp } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_IP - 1; tentativa++) doIp.registrarFalha({ login: `alvo${tentativa}`, ip: '10.0.0.9' });
    doIp.registrarSucesso({ login: 'alvo0', ip: '10.0.0.9' });
    doIp.registrarFalha({ login: 'outro', ip: '10.0.0.9' });
    assert.equal(segundosDoBloqueio(doIp, { login: 'qualquer', ip: '10.0.0.9' }), ATRASO_BASE_EM_SEGUNDOS, 'o IP seguiu contando');
});

test('o IP com falhas demais é bloqueado mesmo trocando de login, e outro IP não é afetado', () => {
    const { limite } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_IP; tentativa++) limite.registrarFalha({ login: `usuario${tentativa}`, ip: '10.0.0.9' });
    assert.equal(segundosDoBloqueio(limite, { login: 'novo', ip: '10.0.0.9' }), ATRASO_BASE_EM_SEGUNDOS);
    assert.equal(segundosDoBloqueio(limite, { login: 'novo', ip: '10.0.0.10' }), null);
});

test('o login bloqueado vale de qualquer IP; outro login do mesmo IP segue livre', () => {
    const { limite } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_LOGIN; tentativa++) limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite, { login: 'maria', ip: '192.168.0.5' }), ATRASO_BASE_EM_SEGUNDOS);
    assert.equal(segundosDoBloqueio(limite, { login: 'joao', ip: '10.0.0.1' }), null);
});

test('sem falha nova pela janela de esquecimento, a contagem recomeça', () => {
    const { limite, avancar } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_LOGIN - 1; tentativa++) limite.registrarFalha(maria);
    avancar(JANELA_DE_ESQUECIMENTO_EM_SEGUNDOS + 1);
    limite.registrarFalha(maria);
    assert.equal(segundosDoBloqueio(limite), null, 'a falha antiga foi esquecida');
});

test('o tempo informado arredonda para cima', () => {
    const { limite, avancar } = criar();
    for (let tentativa = 0; tentativa < LIMITE_DE_FALHAS_POR_LOGIN; tentativa++) limite.registrarFalha(maria);
    avancar(ATRASO_BASE_EM_SEGUNDOS - 0.4);
    assert.equal(segundosDoBloqueio(limite), 1);
});
