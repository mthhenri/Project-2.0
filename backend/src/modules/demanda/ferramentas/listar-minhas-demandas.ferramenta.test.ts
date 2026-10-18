import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { DemandaService } from '../services/demanda.service';
import { LIMITE_DEMANDAS_DA_FERRAMENTA, ListarMinhasDemandasFerramenta } from './listar-minhas-demandas.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(quantidade: number) {
  const chamadas: number[] = [];
  const servico = {
    listarAtribuidas: async (usuarioAtivo: { sub: number }) => {
      chamadas.push(usuarioAtivo.sub);
      return { dados: Array.from({ length: quantidade }, (_, i) => ({ id: i + 1, nome: `Demanda ${i + 1}`, projetoId: 1, nomeProjeto: 'Loja' })) };
    },
  };
  return { ferramenta: new ListarMinhasDemandasFerramenta(servico as unknown as DemandaService), chamadas };
}

test('lista as demandas do usuário do token com id, nome e projeto', async () => {
  const { ferramenta, chamadas } = criar(2);
  const resultado = await ferramenta.executar({}, USUARIO);
  assert.deepEqual(chamadas, [7]);
  assert.deepEqual(resultado.demandas, [
    { id: 1, nome: 'Demanda 1', projeto: 'Loja' },
    { id: 2, nome: 'Demanda 2', projeto: 'Loja' },
  ]);
  assert.equal(resultado.haMais, false);
});

test('limita o que volta à IA e avisa que há mais', async () => {
  const { ferramenta } = criar(LIMITE_DEMANDAS_DA_FERRAMENTA + 5);
  const resultado = await ferramenta.executar({}, USUARIO);
  assert.equal(resultado.demandas.length, LIMITE_DEMANDAS_DA_FERRAMENTA);
  assert.equal(resultado.total, LIMITE_DEMANDAS_DA_FERRAMENTA + 5);
  assert.equal(resultado.haMais, true);
});
