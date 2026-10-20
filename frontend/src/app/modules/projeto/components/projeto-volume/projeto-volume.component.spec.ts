import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjetoVolumeComponent } from './projeto-volume.component';

// "Volume" (tasks 197 e 199): horas gastas × esperadas por projeto, em gráfico de barras, mensal ou anual.

type Montado = ComponenteMontado<ProjetoVolumeComponent>;

function item(projetoId: number, minutosGastos: number, volumeEsperadoHorasMes: number | null) {
  return { projetoId, nome: `Projeto ${projetoId}`, codigo: `P${projetoId}`, cor: '#336699', minutosGastos, volumeEsperadoHorasMes };
}

function itemAnual(projetoId: number, minutosGastosPorMes: number[], volumeEsperadoHorasMes: number | null) {
  return { projetoId, nome: `Projeto ${projetoId}`, codigo: `P${projetoId}`, cor: '#336699', volumeEsperadoHorasMes, minutosGastosPorMes };
}

const ANO_SEM_EXECUCAO = new Array<number>(12).fill(0);

async function montar(): Promise<Montado> {
  return montarComponente(ProjetoVolumeComponent, { usuario: TipoUsuarioEnum.GESTOR });
}

async function carregarMensal(montado: Montado, itens: ReturnType<typeof item>[]): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/volume'), itens);
  await montado.atualizar();
}

async function irParaAnual(montado: Montado, itens: ReturnType<typeof itemAnual>[]): Promise<void> {
  montado.componente.periodoControl.setValue('ANUAL');
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual'), itens);
  await montado.atualizar();
}

const texto = (montado: Montado) => (montado.elemento.textContent ?? '').replace(/\s+/g, ' ');
const barras = (montado: Montado) => montado.elemento.querySelectorAll('.grafico-barras__barra');

describe('ProjetoVolumeComponent — mensal', () => {
  it('abre no mensal do mês atual: esqueleto e depois o gráfico', async () => {
    const montado = await montar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    const hoje = montado.componente.hoje;
    expect(requisicao.request.params.get('ano')).toBe(String(hoje.getFullYear()));
    expect(requisicao.request.params.get('mes')).toBe(String(hoje.getMonth() + 1));
    responderSucesso(requisicao, [item(1, 720, 40)]);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(montado.elemento.querySelector('app-grafico-barras')).not.toBeNull();
  });

  it('desenha duas barras por projeto com esperado (gastas e esperadas) e uma sem esperado', async () => {
    const montado = await montar();
    await carregarMensal(montado, [item(1, 918, 40), item(2, 300, null)]);
    expect(barras(montado)).toHaveLength(3);
    expect(texto(montado)).toContain('15h 18min');
    expect(texto(montado)).toContain('40h 0min');
    expect(texto(montado)).toContain('P1');
    expect(texto(montado)).toContain('P2');
  });

  it('estouro: a barra de gastas fica vermelha e o tooltip avisa', async () => {
    const montado = await montar();
    await carregarMensal(montado, [item(1, 150, 2)]);
    const gastas = barras(montado)[0] as SVGRectElement;
    expect(gastas.style.fill).toContain('--p-red-500');
    expect(gastas.querySelector('title')?.textContent).toContain('acima do esperado');
  });

  it('mês sem execução: barra de altura zero, sem erro', async () => {
    const montado = await montar();
    await carregarMensal(montado, [item(1, 0, 40)]);
    expect((barras(montado)[0] as SVGRectElement).getAttribute('height')).toBe('0');
  });

  it('sem projetos: estado vazio', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    expect(texto(montado)).toContain('Nenhum projeto ainda');
    expect(montado.elemento.querySelector('app-grafico-barras')).toBeNull();
  });

  it('mês anterior pede o mês anterior; o próximo e o "Mês atual" ficam desabilitados no mês atual e voltam a valer depois', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    expect(montado.componente.visualizandoMesAtual()).toBe(true);

    montado.componente.retornarMes();
    const anterior = new Date(montado.componente.hoje.getFullYear(), montado.componente.hoje.getMonth() - 1, 1);
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    expect(requisicao.request.params.get('ano')).toBe(String(anterior.getFullYear()));
    expect(requisicao.request.params.get('mes')).toBe(String(anterior.getMonth() + 1));
    responderSucesso(requisicao, [item(1, 60, null)]);
    await montado.atualizar();
    expect(montado.componente.visualizandoMesAtual()).toBe(false);

    montado.componente.irParaMesAtual();
    esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    expect(montado.componente.visualizandoMesAtual()).toBe(true);
  });

  it('escolher o mês no seletor pede aquele mês e mostra o primeiro dia dele', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    montado.componente.mesControl.setValue(new Date(2026, 5, 15));
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    expect([requisicao.request.params.get('ano'), requisicao.request.params.get('mes')]).toEqual(['2026', '6']);
    expect(montado.componente.mes().getDate()).toBe(1);
    responderSucesso(requisicao, []);
  });

  it('avançar no mês atual não faz nada (não há futuro)', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    montado.componente.avancarMes();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/projeto/volume'));
  });

  it('resposta atrasada de outro mês não sobrescreve o mês que está na tela', async () => {
    const montado = await montar();
    const primeira = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    montado.componente.retornarMes();
    const segunda = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    responderSucesso(segunda, [item(2, 60, null)]);
    responderSucesso(primeira, [item(1, 60, null)]);
    await montado.atualizar();
    expect(texto(montado)).toContain('P2');
    expect(texto(montado)).not.toContain('P1');
  });

  it('erro da API: sai do carregamento e avisa por toast', async () => {
    const montado = await montar();
    const avisos: unknown[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(mensagem));
    responderErro(esperarRequisicao(montado.http, 'GET', '/projeto/volume'), 500, 'falha');
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(avisos).toHaveLength(1);
  });
});

describe('ProjetoVolumeComponent — anual', () => {
  it('trocar para Anual pede o ano atual e desenha um gráfico de doze barras por projeto', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    montado.componente.periodoControl.setValue('ANUAL');
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual');
    expect(requisicao.request.params.get('ano')).toBe(String(montado.componente.hoje.getFullYear()));
    responderSucesso(requisicao, [
      itemAnual(1, [0, 0, 0, 0, 0, 0, 0, 0, 60, 918, 0, 0], 40),
      itemAnual(2, ANO_SEM_EXECUCAO, null),
    ]);
    await montado.atualizar();
    expect(montado.elemento.querySelectorAll('app-grafico-barras')).toHaveLength(2);
    expect(barras(montado)).toHaveLength(24);
    expect(texto(montado)).toContain('Jan');
    expect(texto(montado)).toContain('Dez');
    expect(texto(montado)).toContain('15h 18min');
  });

  it('a linha tracejada do esperado só aparece no projeto que tem volume definido', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    await irParaAnual(montado, [itemAnual(1, ANO_SEM_EXECUCAO, 40), itemAnual(2, ANO_SEM_EXECUCAO, null)]);
    expect(montado.elemento.querySelectorAll('.grafico-barras__referencia')).toHaveLength(1);
    expect(texto(montado)).toContain('sem volume definido');
    expect(texto(montado)).toContain('40h por mês');
  });

  it('o mês acima do esperado fica vermelho e os outros não', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    await irParaAnual(montado, [itemAnual(1, [0, 0, 0, 0, 0, 0, 0, 0, 60, 3000, 0, 0], 40)]);
    const vermelhas = Array.from(barras(montado)).filter((barra) => (barra as SVGRectElement).style.fill.includes('--p-red-500'));
    expect(vermelhas).toHaveLength(1);
  });

  it('sem projetos no ano: estado vazio', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    await irParaAnual(montado, []);
    expect(texto(montado)).toContain('Nenhum projeto ainda');
  });

  it('ano anterior pede o ano anterior; o próximo e o "Ano atual" ficam desabilitados no ano atual', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    await irParaAnual(montado, []);
    expect(montado.componente.visualizandoAnoAtual()).toBe(true);

    montado.componente.retornarAno();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual');
    expect(requisicao.request.params.get('ano')).toBe(String(montado.componente.hoje.getFullYear() - 1));
    responderSucesso(requisicao, []);
    await montado.atualizar();
    expect(montado.componente.visualizandoAnoAtual()).toBe(false);

    montado.componente.irParaAnoAtual();
    esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual');
    expect(montado.componente.visualizandoAnoAtual()).toBe(true);
  });

  it('avançar no ano atual não faz nada, e escolher o ano no seletor pede aquele ano', async () => {
    const montado = await montar();
    await carregarMensal(montado, []);
    await irParaAnual(montado, []);
    montado.componente.avancarAno();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/projeto/volume/anual'));

    montado.componente.anoControl.setValue(new Date(2024, 6, 10));
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual');
    expect(requisicao.request.params.get('ano')).toBe('2024');
    responderSucesso(requisicao, []);
  });

  it('voltar para Mensal pede o mês de novo, e resposta atrasada da outra visão não aparece', async () => {
    const montado = await montar();
    const mensalAtrasada = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    montado.componente.periodoControl.setValue('ANUAL');
    const anual = esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual');
    responderSucesso(anual, [itemAnual(7, ANO_SEM_EXECUCAO, null)]);
    responderSucesso(mensalAtrasada, [item(9, 60, null)]);
    await montado.atualizar();
    expect(texto(montado)).toContain('Projeto 7');
    expect(texto(montado)).not.toContain('P9');
  });
});
