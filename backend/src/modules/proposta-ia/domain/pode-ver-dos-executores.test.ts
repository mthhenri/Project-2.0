import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AlterarAtividadeExecutor } from '../../atividade/executores/alterar-atividade.executor';
import { AtribuirTagExecutor } from '../../atividade/executores/atribuir-tag.executor';
import { CriarAtividadeExecutor } from '../../atividade/executores/criar-atividade.executor';
import { ExcluirAtividadeExecutor } from '../../atividade/executores/excluir-atividade.executor';
import { MoverAtividadeExecutor } from '../../atividade/executores/mover-atividade.executor';
import { AlterarDemandaExecutor } from '../../demanda/executores/alterar-demanda.executor';
import { AtribuirMembroExecutor } from '../../demanda/executores/atribuir-membro.executor';
import { ConcluirDemandaExecutor } from '../../demanda/executores/concluir-demanda.executor';
import { ConectarDemandaExecutor } from '../../demanda/executores/conectar-demanda.executor';
import { CriarDemandaExecutor } from '../../demanda/executores/criar-demanda.executor';
import { DesconectarDemandaExecutor } from '../../demanda/executores/desconectar-demanda.executor';
import { DescreverDemandaExecutor } from '../../demanda/executores/descrever-demanda.executor';
import { IniciarExecucaoExecutor } from '../../execucao/executores/iniciar-execucao.executor';

// O `podeVer` dos executores (task 315): a outra pessoa da conversa do `@IA` vê a proposta só se as services, com o usuário DELA, leem o alvo.
// Os dublês das services leem as atividades 1 e as demandas 10 e 11, e recusam o resto como a service real recusa (não encontrado ou sem acesso).

const OUTRA = { sub: 9, login: 'bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const atividadeService = {
    recuperar: async ({ id }: { id: number }) => {
        if (id === 1) return { dados: { id } };
        throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
    },
};
const demandaService = {
    recuperar: async ({ id }: { id: number }) => {
        if (id === 10 || id === 11) return { dados: { id } };
        throw new ResourceNotFoundException('Demanda');
    },
};
const atividadeRepositorio = { validarAcessoDemanda: async ({ demandaId, usuarioId }: { demandaId: number; usuarioId: number }) => demandaId === 10 && usuarioId === 9 };

const ve = async (executor: { podeVer?: (dados: Record<string, unknown>, usuario: never) => Promise<boolean> }, dados: Record<string, unknown>) => executor.podeVer!(dados, OUTRA);

test('alvo atividade: alterar, excluir e iniciar execução', async () => {
    for (const executor of [
        new AlterarAtividadeExecutor(atividadeService as never),
        new ExcluirAtividadeExecutor(atividadeService as never, atividadeRepositorio as never),
        new IniciarExecucaoExecutor({} as never, atividadeService as never),
    ]) {
        assert.equal(await ve(executor, { atividadeId: 1 }), true, executor.tipo);
        assert.equal(await ve(executor, { atividadeId: 2 }), false, executor.tipo);
        assert.equal(await ve(executor, {}), false, `${executor.tipo} sem o id`);
    }
});

test('mover atividade: precisa ver a atividade e a demanda de destino', async () => {
    const executor = new MoverAtividadeExecutor(atividadeService as never, demandaService as never);
    assert.equal(await ve(executor, { atividadeId: 1, demandaDestinoId: 10 }), true);
    assert.equal(await ve(executor, { atividadeId: 1, demandaDestinoId: 12 }), false, 'não vê o destino');
    assert.equal(await ve(executor, { atividadeId: 2, demandaDestinoId: 10 }), false, 'não vê a atividade');
});

test('criar atividade: precisa ser membro da demanda, a regra das atividades', async () => {
    const executor = new CriarAtividadeExecutor({} as never, atividadeRepositorio as never);
    assert.equal(await ve(executor, { demandaId: 10, nome: 'x' }), true);
    assert.equal(await ve(executor, { demandaId: 11, nome: 'x' }), false);
});

test('atribuir tag: o alvo é a demanda ou a atividade, conforme o campo', async () => {
    const executor = new AtribuirTagExecutor(demandaService as never, atividadeService as never);
    assert.equal(await ve(executor, { alvo: 'DEMANDA', alvoId: 10 }), true);
    assert.equal(await ve(executor, { alvo: 'DEMANDA', alvoId: 12 }), false);
    assert.equal(await ve(executor, { alvo: 'ATIVIDADE', alvoId: 1 }), true);
    assert.equal(await ve(executor, { alvo: 'ATIVIDADE', alvoId: 10 }), false);
});

test('alvo demanda: alterar, atribuir membro, concluir e descrever', async () => {
    for (const executor of [
        new AlterarDemandaExecutor(demandaService as never, {} as never),
        new AtribuirMembroExecutor(demandaService as never, {} as never),
        new ConcluirDemandaExecutor(demandaService as never),
        new DescreverDemandaExecutor(demandaService as never),
    ]) {
        assert.equal(await ve(executor, { demandaId: 10 }), true, executor.tipo);
        assert.equal(await ve(executor, { demandaId: 12 }), false, executor.tipo);
    }
});

test('conectar e desconectar: precisa ver as duas demandas', async () => {
    for (const executor of [new ConectarDemandaExecutor(demandaService as never), new DesconectarDemandaExecutor(demandaService as never, {} as never)]) {
        assert.equal(await ve(executor, { demandaOrigemId: 10, demandaDestinoId: 11 }), true, executor.tipo);
        assert.equal(await ve(executor, { demandaOrigemId: 10, demandaDestinoId: 12 }), false, executor.tipo);
    }
});

test('criar demanda: vê pela demanda-mãe; a de topo (só o projeto) fica oculta', async () => {
    const executor = new CriarDemandaExecutor(demandaService as never, {} as never, {} as never);
    assert.equal(await ve(executor, { demandaPaiId: 10, nome: 'x' }), true);
    assert.equal(await ve(executor, { demandaPaiId: 12, nome: 'x' }), false);
    assert.equal(await ve(executor, { projetoId: 3, nome: 'x' }), false);
});
