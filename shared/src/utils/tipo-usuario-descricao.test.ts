import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { DESCRICAO_TIPO_USUARIO, MARCA_AJUDA_NAO_PODE, MARCA_AJUDA_PODE, TIPOS_USUARIO_NA_ORDEM_DA_AJUDA } from './tipo-usuario-descricao';

test('todo tipo de usuário tem texto, com ao menos um item de "pode" e um de "não pode"', () => {
    for (const tipo of Object.values(TipoUsuarioEnum)) {
        const texto = DESCRICAO_TIPO_USUARIO[tipo];
        assert.ok(texto?.trim().length > 0, `falta o texto de ${tipo}`);
        assert.ok(texto.split('\n').some((linha) => linha.startsWith(`${MARCA_AJUDA_PODE} `)), `${tipo} sem item de "pode"`);
        assert.ok(texto.split('\n').some((linha) => linha.startsWith(`${MARCA_AJUDA_NAO_PODE} `)), `${tipo} sem item de "não pode"`);
    }
});

test('o texto padrão cabe no limite do banco (2000 caracteres)', () => {
    for (const tipo of Object.values(TipoUsuarioEnum)) assert.ok(DESCRICAO_TIPO_USUARIO[tipo].length <= 2000, `${tipo} passa do limite`);
});

test('a ordem da ajuda tem cada tipo uma vez só, sem esquecer nenhum', () => {
    assert.deepEqual([...TIPOS_USUARIO_NA_ORDEM_DA_AJUDA].sort(), Object.values(TipoUsuarioEnum).sort());
});
