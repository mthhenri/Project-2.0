import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ObservadoresDeMembrosDaDemandaRegistro } from './observador-de-membros-da-demanda';

test('notificar: avisa todos os observadores registrados, na ordem', async () => {
    const registro = new ObservadoresDeMembrosDaDemandaRegistro();
    const chamadas: string[] = [];
    registro.registrar({ aoAlterarMembros: async (dto) => { chamadas.push(`primeiro:${dto.demandaId}:${dto.usuarioIds.join(',')}`); } });
    registro.registrar({ aoAlterarMembros: async (dto) => { chamadas.push(`segundo:${dto.demandaId}`); } });
    await registro.notificar({ demandaId: 4, usuarioIds: [1, 2] });
    assert.deepEqual(chamadas, ['primeiro:4:1,2', 'segundo:4']);
});

test('notificar: sem ninguém para avisar não chama observador nenhum', async () => {
    const registro = new ObservadoresDeMembrosDaDemandaRegistro();
    let chamou = false;
    registro.registrar({ aoAlterarMembros: async () => { chamou = true; } });
    await registro.notificar({ demandaId: 4, usuarioIds: [] });
    assert.equal(chamou, false);
});

test('notificar: um observador que falha não impede os outros nem falha o pedido de quem mudou os membros', async () => {
    const registro = new ObservadoresDeMembrosDaDemandaRegistro();
    let avisouOSegundo = false;
    registro.registrar({ aoAlterarMembros: async () => { throw new Error('barramento fora do ar'); } });
    registro.registrar({ aoAlterarMembros: async () => { avisouOSegundo = true; } });
    await registro.notificar({ demandaId: 4, usuarioIds: [1] });
    assert.equal(avisouOSegundo, true);
});
