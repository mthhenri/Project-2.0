import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ObservadoresDeMembrosDaDemandaRegistro } from '../../demanda/domain/observador-de-membros-da-demanda';
import { CanalMembrosObservadorService } from './canal-membros-observador.service';

function montar(cenario: { demandaExiste?: boolean; canais?: { grupoId: number }[]; membrosDosCanais?: number[] } = {}) {
    const publicados: unknown[] = [];
    const consultas: Record<string, unknown> = {};
    const eventos = { publicarParaUsuarios: async (dto: unknown) => { publicados.push(dto); } };
    const demanda = { recuperar: async () => (cenario.demandaExiste === false ? null : { id: 10, projetoId: 5 }) };
    const grupos = { listarCanais: async (dto: unknown) => { consultas.canais = dto; return cenario.canais ?? []; } };
    const canais = { listarMembrosDeGrupos: async (lista: unknown[]) => { consultas.membros = lista; return (cenario.membrosDosCanais ?? []).map((usuarioId) => ({ usuarioId })); } };
    const registro = new ObservadoresDeMembrosDaDemandaRegistro();
    const observador = new CanalMembrosObservadorService(registro, eventos as never, demanda as never, grupos as never, canais as never);
    return { publicados, consultas, registro, observador };
}

test('quem entra ou sai da demanda recebe SINCRONIZAR sem conversa, uma vez só por pessoa', async () => {
    const { publicados, observador } = montar();
    await observador.aoAlterarMembros({ demandaId: 10, usuarioIds: [3, 8, 3] });
    assert.deepEqual(publicados, [{ usuarioIds: [3, 8], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});

test('quem já está nos canais da demanda e do projeto também recebe, sem repetir ninguém (P-089)', async () => {
    const { publicados, consultas, observador } = montar({ canais: [{ grupoId: 1 }, { grupoId: 2 }], membrosDosCanais: [3, 4, 5, 4] });
    await observador.aoAlterarMembros({ demandaId: 10, usuarioIds: [3] });

    assert.deepEqual(consultas.canais, { demandaIds: [10], projetoIds: [5] });
    assert.deepEqual(publicados, [{ usuarioIds: [3, 4, 5], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});

test('demanda que não existe mais avisa só quem mudou', async () => {
    const { publicados, observador } = montar({ demandaExiste: false, membrosDosCanais: [9] });
    await observador.aoAlterarMembros({ demandaId: 10, usuarioIds: [3] });
    assert.deepEqual(publicados, [{ usuarioIds: [3], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});

test('na subida do módulo ele se registra, e o aviso da demanda chega ao tempo real do chat', async () => {
    const { publicados, registro, observador } = montar();
    observador.onModuleInit();
    await registro.notificar({ demandaId: 10, usuarioIds: [3] });
    assert.deepEqual(publicados, [{ usuarioIds: [3], evento: { tipo: 'SINCRONIZAR', conversaId: null } }]);
});
