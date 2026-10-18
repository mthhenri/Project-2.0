import { test } from 'node:test';
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
