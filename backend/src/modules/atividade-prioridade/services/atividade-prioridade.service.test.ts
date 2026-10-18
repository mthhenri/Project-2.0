import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoUsuarioEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadePrioridadeRepository } from '../repositories/atividade-prioridade.repository';
import { AtividadePrioridadeService } from './atividade-prioridade.service';

const ADMINISTRADOR = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function montar(existe = true) {
  const gravadas: { codigo: string; cor: string }[] = [];
  const repositorio = {
    async listar() {
      return [];
    },
    async alterarCor(codigo: TipoAtividadePrioridadeEnum, cor: string) {
      gravadas.push({ codigo, cor });
      return existe ? { codigo, descricao: 'Alta', ordem: 2, cor } : null;
    },
  };
  return { servico: new AtividadePrioridadeService(repositorio as unknown as AtividadePrioridadeRepository), gravadas };
}

test('o administrador altera a cor, gravada em minúsculas', async () => {
  const { servico, gravadas } = montar();
  const resposta = await servico.alterarCor(TipoAtividadePrioridadeEnum.ALTA, { cor: '#FF8800' }, ADMINISTRADOR);
  assert.deepEqual(gravadas, [{ codigo: 'ALTA', cor: '#ff8800' }]);
  assert.equal(resposta.dados?.cor, '#ff8800');
});

test('gestor e desenvolvedor não alteram a cor', async () => {
  for (const usuario of [GESTOR, DESENVOLVEDOR]) {
    const { servico, gravadas } = montar();
    await assert.rejects(servico.alterarCor(TipoAtividadePrioridadeEnum.ALTA, { cor: '#ff8800' }, usuario), UnauthorizedAccessException);
    assert.equal(gravadas.length, 0);
  }
});

test('prioridade inexistente é 404', async () => {
  const { servico } = montar(false);
  await assert.rejects(servico.alterarCor(TipoAtividadePrioridadeEnum.ALTA, { cor: '#ff8800' }, ADMINISTRADOR), ResourceNotFoundException);
});
