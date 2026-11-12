import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { LIMITE_MEMBROS_DO_GRUPO, LIMITE_NOME_DO_GRUPO, grupoEhPrivado } from './grupo';

test('o grupo é privado para a supervisão quando algum membro é gestor ou administrador', () => {
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.DESENVOLVEDOR]), false);
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR]), true);
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.ADMINISTRADOR]), true);
    assert.equal(grupoEhPrivado([]), false);
});

test('os limites do grupo livre são os da decisão do autor', () => {
    assert.equal(LIMITE_MEMBROS_DO_GRUPO, 50);
    assert.equal(LIMITE_NOME_DO_GRUPO, 60);
});
