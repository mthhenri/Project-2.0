import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AssistenteController } from './assistente.controller';

// SYSTEM.SPEC.md §12 (`assistente`): uma rota, para qualquer usuário autenticado (nem gestor nem administrador).

test('duas rotas, POST auxiliar-descricao e POST alterar-trecho, abertas a qualquer usuário autenticado', () => {
    const rotas = Object.values(rotasPorNome(AssistenteController));
    assert.deepEqual(rotas.map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), ['POST alterar-trecho', 'POST auxiliar-descricao']);
    for (const rota of rotas) {
        assert.equal(rota.publica, false);
        assert.equal(rota.gestorOnly, false);
        assert.equal(rota.administradorOnly, false);
    }
});

test('o login vem do guard global (nenhum @UseGuards repetido no controller) e nenhuma rota é pública', () => {
    assert.equal(Reflect.getMetadata(GUARDS_METADATA, AssistenteController), undefined);
    for (const rota of Object.values(rotasPorNome(AssistenteController))) assert.equal(rota.publica, false);
});

test('auxiliar-descricao repassa o DTO e o usuário ativo à service (o uso entra em Custos em nome dele)', async () => {
    const recebidos: unknown[][] = [];
    const controller = new AssistenteController({ auxiliarDescricao: async (...argumentos: unknown[]) => { recebidos.push(argumentos); return null; } } as never);
    const dto = { textoOriginal: 'a', tipoEntidade: 'execucao', contextoEntidade: 'b' } as const;
    const usuario = { sub: 7, login: 'd', tipo: 'DESENVOLVEDOR' } as never;
    await controller.auxiliarDescricao(dto, usuario);
    assert.deepEqual(recebidos, [[dto, usuario]]);
});

test('alterar-trecho repassa o DTO e o usuário ativo à service', async () => {
    const recebidos: unknown[][] = [];
    const controller = new AssistenteController({ alterarTrecho: async (...argumentos: unknown[]) => { recebidos.push(argumentos); return null; } } as never);
    const dto = { demandaId: 1, aba: 'DOCUMENTACAO', bloco: 'a', selecao: 'a', pedido: 'b' } as never;
    const usuario = { sub: 1, login: 'g', tipo: 'GESTOR' } as never;
    await controller.alterarTrecho(dto, usuario);
    assert.deepEqual(recebidos, [[dto, usuario]]);
});
