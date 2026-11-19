import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { recuperarExecucaoAtivaDetalhada } from './execucao-ativa-detalhada';

// A execução ativa com os nomes da atividade, da demanda e do projeto, lida numa consulta só (task 334).

const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const ATIVA = {
    id: 50, atividadeId: 10, descricao: 'provisória', inicioData: '2026-01-15T12:00:00Z',
    nomeAtividade: 'Ajustar login', nomeDemanda: 'Login', nomeProjeto: 'Portal', nomeUsuario: 'Ana',
};

function criarServico(ativa: unknown) {
    const chamadas: Array<{ metodo: string; dto: unknown; usuarioAtivo: unknown }> = [];
    return {
        chamadas,
        recuperarAtivaDetalhada: async (dto: unknown, usuarioAtivo: unknown) => { chamadas.push({ metodo: 'recuperarAtivaDetalhada', dto, usuarioAtivo }); return { dados: ativa }; },
    };
}

test('sem execução ativa devolve null', async () => {
    const servico = criarServico(null);
    assert.equal(await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR), null);
    assert.equal(servico.chamadas.length, 1);
});

test('por padrão é a execução do usuário do token, com os nomes vindos da mesma leitura (uma chamada só)', async () => {
    const servico = criarServico(ATIVA);
    const detalhada = await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR);
    assert.deepEqual(detalhada, {
        id: 50, atividadeId: 10, descricao: 'provisória', inicioData: new Date('2026-01-15T12:00:00Z'),
        nomeAtividade: 'Ajustar login', nomeDemanda: 'Login', nomeProjeto: 'Portal', nomeUsuario: 'Ana',
    });
    assert.deepEqual(servico.chamadas.map((chamada) => chamada.dto), [{ usuarioId: 3 }]);
});

test('com usuarioId de outra pessoa pede a execução dela (a service recusa o desenvolvedor)', async () => {
    const servico = criarServico(ATIVA);
    await recuperarExecucaoAtivaDetalhada(servico as never, DESENVOLVEDOR, 99);
    assert.deepEqual(servico.chamadas[0].dto, { usuarioId: 99 });
    assert.equal(servico.chamadas[0].usuarioAtivo, DESENVOLVEDOR);
});

test('demanda, projeto ou dono excluídos (nome nulo) ficam indefinidos, mas a execução volta', async () => {
    const detalhada = await recuperarExecucaoAtivaDetalhada(
        criarServico({ ...ATIVA, nomeDemanda: null, nomeProjeto: null, nomeUsuario: null }) as never,
        DESENVOLVEDOR,
    );
    assert.equal(detalhada?.id, 50);
    assert.equal(detalhada?.nomeAtividade, 'Ajustar login');
    assert.equal(detalhada?.nomeDemanda, undefined);
    assert.equal(detalhada?.nomeProjeto, undefined);
    assert.equal(detalhada?.nomeUsuario, undefined);
});
