import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { DESCRICAO_TIPO_USUARIO, TIPOS_USUARIO_NA_ORDEM_DA_AJUDA } from './tipo-usuario-descricao';

test('todo tipo de usuário tem frase, "pode" e "não pode" preenchidos', () => {
    for (const tipo of Object.values(TipoUsuarioEnum)) {
        const descricao = DESCRICAO_TIPO_USUARIO[tipo];
        assert.ok(descricao, `falta a descrição de ${tipo}`);
        assert.ok(descricao.queE.trim().length > 0, `${tipo} sem "o que é"`);
        assert.ok(descricao.pode.length > 0, `${tipo} sem "pode"`);
        assert.ok(descricao.naoPode.length > 0, `${tipo} sem "não pode"`);
    }
});

test('a ordem da ajuda tem cada tipo uma vez só, sem esquecer nenhum', () => {
    assert.deepEqual([...TIPOS_USUARIO_NA_ORDEM_DA_AJUDA].sort(), Object.values(TipoUsuarioEnum).sort());
});
