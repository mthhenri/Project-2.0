import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ObservadoresDeMembrosDaDemandaRegistro } from '../../demanda/domain/observador-de-membros-da-demanda';
import { CanalMembrosObservadorService } from './canal-membros-observador.service';

function montar() {
    const publicados: unknown[] = [];
    const eventos = { publicarParaUsuarios: async (dto: unknown) => { publicados.push(dto); } };
    const registro = new ObservadoresDeMembrosDaDemandaRegistro();
    const observador = new CanalMembrosObservadorService(registro, eventos as never);
    return { publicados, registro, observador };
}

test('quem entra ou sai da demanda recebe SINCRONIZAR sem conversa, uma vez só por pessoa', async () => {
    const { publicados, observador } = montar();
    await observador.aoAlterarMembros({ demandaId: 10, usuarioIds: [3, 8, 3] });
    assert.deepEqual(publicados, [{ usuarioIds: [3, 8], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});

test('na subida do módulo ele se registra, e o aviso da demanda chega ao tempo real do chat', async () => {
    const { publicados, registro, observador } = montar();
    observador.onModuleInit();
    await registro.notificar({ demandaId: 10, usuarioIds: [3] });
    assert.deepEqual(publicados, [{ usuarioIds: [3], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});
