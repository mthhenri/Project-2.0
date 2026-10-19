import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { TagService } from '../services/tag.service';
import { LIMITE_TAGS_DA_FERRAMENTA, ListarTagsFerramenta } from './listar-tags.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(tags: { id: number; nome: string; cor: string }[] | null) {
  let consultas = 0;
  const servico = { listar: async () => { consultas++; return { sucesso: true, dados: tags, mensagem: '' }; } };
  return { ferramenta: new ListarTagsFerramenta(servico as unknown as TagService), consultas: () => consultas };
}

test('é uma leitura aberta a qualquer usuário', () => {
  const { ferramenta } = criar([]);
  assert.equal(ferramenta.nome, 'listar_tags');
  assert.equal(ferramenta.tipo, 'LEITURA');
  assert.equal(ferramenta.permissao, 'QUALQUER');
});

test('devolve id, nome e cor das tags, sem campos extras', async () => {
  const { ferramenta, consultas } = criar([{ id: 1, nome: 'Backend', cor: '#112233', extra: 'x' } as never, { id: 2, nome: 'Frontend', cor: '#445566' }]);
  const saida = await ferramenta.executar({}, USUARIO);
  assert.deepEqual(saida, {
    tags: [{ id: 1, nome: 'Backend', cor: '#112233' }, { id: 2, nome: 'Frontend', cor: '#445566' }],
    total: 2,
    haMais: false,
  });
  assert.equal(consultas(), 1);
});

test('sem tags devolve lista vazia; resposta sem dados também', async () => {
  assert.deepEqual(await criar([]).ferramenta.executar({}, USUARIO), { tags: [], total: 0, haMais: false });
  assert.deepEqual(await criar(null).ferramenta.executar({}, USUARIO), { tags: [], total: 0, haMais: false });
});

test('acima do limite corta a lista, informa o total e marca haMais', async () => {
  const muitas = Array.from({ length: LIMITE_TAGS_DA_FERRAMENTA + 5 }, (_, indice) => ({ id: indice + 1, nome: `Tag ${indice + 1}`, cor: '#000000' }));
  const saida = await criar(muitas).ferramenta.executar({}, USUARIO);
  assert.equal(saida.tags.length, LIMITE_TAGS_DA_FERRAMENTA);
  assert.equal(saida.total, LIMITE_TAGS_DA_FERRAMENTA + 5);
  assert.equal(saida.haMais, true);
});

test('exatamente no limite não marca haMais', async () => {
  const todas = Array.from({ length: LIMITE_TAGS_DA_FERRAMENTA }, (_, indice) => ({ id: indice + 1, nome: `Tag ${indice + 1}`, cor: '#000000' }));
  assert.equal((await criar(todas).ferramenta.executar({}, USUARIO)).haMais, false);
});
