import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { contarFiltrosAtivos, filtrosIguais, filtrosPadrao, lerFiltrosDaUrl, paraParametrosDaUrl } from './filtros-atividade.util';

const url = (texto: string) => new URLSearchParams(texto);

test('sem parâmetros é o padrão: em aberto, sem busca e sem nenhum filtro contado', () => {
  const filtros = lerFiltrosDaUrl(url(''), true);
  assert.deepEqual(filtros, filtrosPadrao());
  assert.equal(contarFiltrosAtivos(filtros), 0);
  assert.deepEqual(paraParametrosDaUrl(filtros), {});
});

test('os filtros fazem a viagem de ida e volta pela URL', () => {
  const filtros = {
    busca: 'login', status: [TipoAtividadeStatusEnum.PENDENTE, TipoAtividadeStatusEnum.DESENVOLVIDA], usuarioId: 8,
    periodo: ['2026-10-01', '2026-10-31'] as [string, string], demandaId: 3,
  };
  const parametros = paraParametrosDaUrl(filtros);
  assert.deepEqual(parametros, { busca: 'login', status: 'PENDENTE,DESENVOLVIDA', usuarioId: '8', periodo: '2026-10-01_2026-10-31', demandaId: '3' });
  assert.deepEqual(lerFiltrosDaUrl(new URLSearchParams(parametros), true), filtros);
  assert.equal(contarFiltrosAtivos(filtros), 5);
});

test('"todos os status" é status=todos e volta como lista vazia; o padrão não vai para a URL', () => {
  const todos = { ...filtrosPadrao(), status: [] };
  assert.deepEqual(paraParametrosDaUrl(todos), { status: 'todos' });
  assert.deepEqual(lerFiltrosDaUrl(url('status=todos'), false).status, []);
  assert.deepEqual(paraParametrosDaUrl({ ...filtrosPadrao(), status: [...filtrosPadrao().status].reverse() }), {});
});

test('o que vem inválido é ignorado e o desenvolvedor não filtra por usuário', () => {
  const filtros = lerFiltrosDaUrl(url('status=INEXISTENTE&usuarioId=abc&demandaId=-2&periodo=ontem_hoje'), true);
  assert.deepEqual(filtros, filtrosPadrao());
  assert.equal(lerFiltrosDaUrl(url('usuarioId=8'), false).usuarioId, null);
  assert.equal(lerFiltrosDaUrl(url('usuarioId=8'), true).usuarioId, 8);
});

test('o período aceita só uma ponta', () => {
  assert.deepEqual(lerFiltrosDaUrl(url('periodo=2026-10-01_'), true).periodo, ['2026-10-01', null]);
  assert.deepEqual(lerFiltrosDaUrl(url('periodo=_2026-10-31'), true).periodo, [null, '2026-10-31']);
  assert.deepEqual(paraParametrosDaUrl({ ...filtrosPadrao(), periodo: ['2026-10-01', null] }), { periodo: '2026-10-01_' });
});

test('filtrosIguais compara pelo que viaja na URL', () => {
  assert.equal(filtrosIguais(filtrosPadrao(), lerFiltrosDaUrl(url(''), true)), true);
  assert.equal(filtrosIguais(filtrosPadrao(), { ...filtrosPadrao(), busca: ' x ' }), false);
  assert.equal(filtrosIguais({ ...filtrosPadrao(), busca: 'x' }, { ...filtrosPadrao(), busca: ' x ' }), true);
});

test('a lista de status da URL ignora os inválidos e sai na ordem das opções; o mesmo conjunto em outra ordem é o padrão', () => {
  assert.deepEqual(lerFiltrosDaUrl(url('status=DESENVOLVIDA,XXX,PENDENTE'), true).status, [
    TipoAtividadeStatusEnum.PENDENTE,
    TipoAtividadeStatusEnum.DESENVOLVIDA,
  ]);
  const outraOrdem = { ...filtrosPadrao(), status: [...filtrosPadrao().status].reverse() };
  assert.deepEqual(paraParametrosDaUrl(outraOrdem), {});
});

test('a busca só de espaços não conta como filtro e não vai para a URL', () => {
  const filtros = lerFiltrosDaUrl(url('busca=%20%20'), true);
  assert.equal(filtros.busca, '');
  assert.deepEqual(paraParametrosDaUrl({ ...filtrosPadrao(), busca: '   ' }), {});
  assert.equal(contarFiltrosAtivos({ ...filtrosPadrao(), busca: '   ' }), 0);
});

test('cada filtro fora do padrão soma um na contagem do "Limpar filtros"', () => {
  const todos = { busca: 'x', status: [], usuarioId: 3, periodo: ['2026-10-01', '2026-10-31'] as [string, string], demandaId: 9 };
  assert.equal(contarFiltrosAtivos(todos), 5);
});
