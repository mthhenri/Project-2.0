import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProjetoVolumeVigenciaService } from './projeto-volume-vigencia.service';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

test('a service escolhe substituir somente a vigência do mesmo mês e normaliza a data', async () => {
  const excluidas: unknown[] = [];
  let inserida: unknown;
  const repositorio = {
    listar: async () => [{ id: 1, vigenciaInicioData: '2026-01-01' }, { id: 2, vigenciaInicioData: '2026-04-01' }],
    excluir: async (dto: unknown) => { excluidas.push(dto); },
    inserir: async (dto: unknown) => { inserida = dto; return dto; },
    emTransacao: async (_dto: unknown, operacao: Function) => operacao(repositorio, true),
  };
  const servico = new ProjetoVolumeVigenciaService(repositorio as never, {} as never);
  await servico.criar({ projetoId: 10, vigenciaInicioData: '2026-04-17', volumeEsperadoHoras: null });
  assert.deepEqual(excluidas, [{ projetoId: 10, vigenciaId: 2 }]);
  assert.deepEqual(inserida, { projetoId: 10, vigenciaInicioData: '2026-04-01', volumeEsperadoHoras: null });
  await servico.criar({ projetoId: 10, vigenciaInicioData: '2026-10-01', volumeEsperadoHoras: 0 });
  assert.equal(excluidas.length, 1);
});

test('recusa projeto inexistente e exclusão de vigência de outro projeto', async () => {
  const repositorio = {
    listar: async () => [{ id: 1, projetoId: 10 }],
    emTransacao: async (_dto: unknown, operacao: Function) => operacao(repositorio, true),
    excluir: async () => { assert.fail('não deve excluir'); },
  };
  const servico = new ProjetoVolumeVigenciaService(repositorio as never, { recuperar: async () => null } as never);
  await assert.rejects(() => servico.listar({ projetoId: 99 }), ResourceNotFoundException);
  await assert.rejects(() => servico.excluir({ projetoId: 10, vigenciaId: 2 }), ResourceNotFoundException);
  repositorio.emTransacao = async (_dto: unknown, operacao: Function) => operacao(repositorio, false);
  await assert.rejects(() => servico.criar({ projetoId: 99, vigenciaInicioData: '2026-01-01', volumeEsperadoHoras: 160 }), ResourceNotFoundException);
});
