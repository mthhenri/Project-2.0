import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { ProjetoVolumeAnualResumoDto, ProjetoVolumeResumoDto } from '@project20/shared';
import { COR_VOLUME_ESPERADO, COR_VOLUME_ESTOURO, montarCategoriasAnuais, montarCategoriasMensais } from './volume-grafico.util';

const mensal = (minutosGastos: number, volumeEsperadoHorasMes: number | null, projetoId = 1): ProjetoVolumeResumoDto =>
  ({ projetoId, nome: `Projeto ${projetoId}`, codigo: `P${projetoId}`, cor: '#336699', minutosGastos, volumeEsperadoHorasMes });

const anual = (minutosGastosPorMes: number[], volumeEsperadoHorasMes: number | null): ProjetoVolumeAnualResumoDto =>
  ({ projetoId: 1, nome: 'Projeto 1', codigo: 'P1', cor: '#336699', volumeEsperadoHorasMes, minutosGastosPorMes });

test('mensal: duas barras por projeto (gastas na cor do projeto e esperadas em cinza), valores em horas', () => {
  const [categoria] = montarCategoriasMensais([mensal(918, 40)], false);
  assert.equal(categoria.rotulo, 'P1');
  assert.equal(categoria.descricao, 'Projeto 1');
  assert.deepEqual(categoria.barras.map((barra) => [barra.valor, barra.cor]), [[15.3, '#336699'], [40, COR_VOLUME_ESPERADO]]);
  assert.equal(categoria.barras[0].rotulo, '15h 18min');
  assert.match(categoria.barras[0].descricao, /15h 18min gastas de 40h 0min \(38%\)/);
});

test('mensal: estouro deixa a barra de gastas vermelha e o tooltip avisa', () => {
  const [categoria] = montarCategoriasMensais([mensal(150, 2)], false);
  assert.equal(categoria.barras[0].cor, COR_VOLUME_ESTOURO);
  assert.equal(categoria.barras[0].destaque, true);
  assert.match(categoria.barras[0].descricao, /acima do esperado/);
});

test('mensal: sem volume definido tem só a barra de gastas', () => {
  const [categoria] = montarCategoriasMensais([mensal(300, null)], false);
  assert.equal(categoria.barras.length, 1);
  assert.match(categoria.barras[0].descricao, /sem volume definido/);
});

test('mensal: os rótulos seguem a preferência em dias, o valor segue em horas', () => {
  const [categoria] = montarCategoriasMensais([mensal(480, 16)], true);
  assert.equal(categoria.barras[0].rotulo, '1 dia');
  assert.equal(categoria.barras[0].valor, 8);
});

test('anual: doze meses, janeiro primeiro, barra única; o mês zerado fica sem rótulo', () => {
  const minutos = [0, 0, 0, 0, 0, 0, 0, 0, 60, 918, 0, 0];
  const categorias = montarCategoriasAnuais(anual(minutos, 40), false);
  assert.deepEqual(categorias.map((categoria) => categoria.rotulo), ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
  assert.equal(categorias[9].barras[0].valor, 15.3);
  assert.equal(categorias[9].barras[0].rotulo, '15h 18min');
  assert.equal(categorias[0].barras[0].rotulo, '');
  assert.equal(categorias[0].barras[0].valor, 0);
});

test('anual: só o mês acima do esperado fica vermelho', () => {
  const categorias = montarCategoriasAnuais(anual([0, 0, 0, 0, 0, 0, 0, 0, 60, 3000, 0, 0], 40), false);
  assert.deepEqual(categorias.map((categoria) => categoria.barras[0].cor === COR_VOLUME_ESTOURO), [false, false, false, false, false, false, false, false, false, true, false, false]);
  assert.match(categorias[9].barras[0].descricao, /acima do esperado/);
  assert.deepEqual(categorias.map((categoria) => categoria.barras[0].destaque), [false, false, false, false, false, false, false, false, false, true, false, false]);
});

test('anual: sem volume esperado nenhum mês estoura nem cita o esperado', () => {
  const categorias = montarCategoriasAnuais(anual(new Array(12).fill(6000), null), false);
  assert.equal(categorias.some((categoria) => categoria.barras[0].cor === COR_VOLUME_ESTOURO), false);
  assert.doesNotMatch(categorias[0].barras[0].descricao, / de /);
});
