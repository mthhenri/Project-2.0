import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import {
    podeAtribuirMembroOuTag,
    podeConduzirExecucaoDeOutro,
    podeEditarAtividadeDeOutro,
    podeEditarDemanda,
    podeEditarExecucaoDeOutro,
    podeGerenciarTag,
    podePublicarPlano,
    podeSerMembroDeDemanda,
    podeVerExecucaoEPontoDeOutro,
    temPermissaoDeAdministrador,
    temPermissaoDeGestor,
    temVisibilidadeTotal,
} from './permissao-usuario';

test('gestor tem permissão de gestor', () => {
    assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.GESTOR), true);
});

test('administrador tem permissão de gestor', () => {
    assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.ADMINISTRADOR), true);
});

test('desenvolvedor não tem permissão de gestor', () => {
    assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.DESENVOLVEDOR), false);
});

test('só o administrador tem permissão de administrador', () => {
    assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.ADMINISTRADOR), true);
    assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.GESTOR), false);
    assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.DESENVOLVEDOR), false);
});

test('auxiliar não tem permissão de gestor nem de administrador', () => {
    assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.AUXILIAR), false);
    assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.AUXILIAR), false);
});

const ACOES_DE_QUEM_CONDUZ = {
    temVisibilidadeTotal,
    podeEditarDemanda,
    podeAtribuirMembroOuTag,
    podePublicarPlano,
    podeEditarAtividadeDeOutro,
    podeConduzirExecucaoDeOutro,
    podeVerExecucaoEPontoDeOutro,
    podeEditarExecucaoDeOutro,
    podeGerenciarTag,
};

for (const [nome, acao] of Object.entries(ACOES_DE_QUEM_CONDUZ)) {
    test(`${nome}: auxiliar, gestor e administrador podem; desenvolvedor não`, () => {
        assert.equal(acao(TipoUsuarioEnum.AUXILIAR), true);
        assert.equal(acao(TipoUsuarioEnum.GESTOR), true);
        assert.equal(acao(TipoUsuarioEnum.ADMINISTRADOR), true);
        assert.equal(acao(TipoUsuarioEnum.DESENVOLVEDOR), false);
    });
}

test('podeSerMembroDeDemanda: desenvolvedor e auxiliar; gestor e administrador têm acesso por tipo', () => {
    assert.equal(podeSerMembroDeDemanda(TipoUsuarioEnum.DESENVOLVEDOR), true);
    assert.equal(podeSerMembroDeDemanda(TipoUsuarioEnum.AUXILIAR), true);
    assert.equal(podeSerMembroDeDemanda(TipoUsuarioEnum.GESTOR), false);
    assert.equal(podeSerMembroDeDemanda(TipoUsuarioEnum.ADMINISTRADOR), false);
});
