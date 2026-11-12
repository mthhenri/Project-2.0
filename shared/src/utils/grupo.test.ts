import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoGrupoEnum } from '../enums/tipo-grupo.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { LIMITE_MEMBROS_DO_GRUPO, LIMITE_NOME_DO_GRUPO, grupoEhCanal, grupoEhPrivado } from './grupo';

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

test('só o canal de demanda e o de projeto são canais', () => {
    assert.equal(grupoEhCanal(TipoGrupoEnum.DEMANDA), true);
    assert.equal(grupoEhCanal(TipoGrupoEnum.PROJETO), true);
    assert.equal(grupoEhCanal(TipoGrupoEnum.LIVRE), false);
});

test('o canal nunca é privado para a supervisão, mesmo com gestor entre os membros', () => {
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR], TipoGrupoEnum.DEMANDA), false);
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.ADMINISTRADOR], TipoGrupoEnum.PROJETO), false);
    assert.equal(grupoEhPrivado([TipoUsuarioEnum.GESTOR], TipoGrupoEnum.LIVRE), true, 'o grupo livre segue a regra de sempre');
});
