import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjetoVolumeComponent } from './projeto-volume.component';

// "Volume do mês" (task 197): horas gastas × esperadas por projeto, no mês escolhido (o atual por padrão).

type Montado = ComponenteMontado<ProjetoVolumeComponent>;

function item(projetoId: number, minutosGastos: number, volumeEsperadoHorasMes: number | null) {
  return { projetoId, nome: `Projeto ${projetoId}`, codigo: `P${projetoId}`, cor: '#336699', minutosGastos, volumeEsperadoHorasMes };
}

async function montar(): Promise<Montado> {
  return montarComponente(ProjetoVolumeComponent, { usuario: TipoUsuarioEnum.GESTOR });
}

async function carregar(montado: Montado, itens: ReturnType<typeof item>[]): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/volume'), itens);
  await montado.atualizar();
}

const texto = (montado: Montado) => (montado.elemento.textContent ?? '').replace(/\s+/g, ' ');

describe('ProjetoVolumeComponent', () => {
  it('pede o mês atual, mostra o esqueleto e depois as linhas', async () => {
    const montado = await montar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    const hoje = montado.componente.hoje;
    expect(requisicao.request.params.get('ano')).toBe(String(hoje.getFullYear()));
    expect(requisicao.request.params.get('mes')).toBe(String(hoje.getMonth() + 1));
    responderSucesso(requisicao, [item(1, 720, 40)]);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(texto(montado)).toContain('Projeto 1');
  });

  it('12 h de 40 h: mostra as horas, o esperado e 30%, sem destaque de estouro', async () => {
    const montado = await montar();
    await carregar(montado, [item(1, 720, 40)]);
    expect(texto(montado)).toContain('12h 0min');
    expect(texto(montado)).toContain('40h 0min');
    expect(texto(montado)).toContain('(30%)');
    expect(montado.elemento.querySelector('.projeto-volume__linha--estouro')).toBeNull();
    expect(montado.elemento.querySelector('p-progressbar')).not.toBeNull();
  });

  it('sem volume esperado: só as horas, "sem volume definido" e nenhuma barra', async () => {
    const montado = await montar();
    await carregar(montado, [item(1, 300, null)]);
    expect(texto(montado)).toContain('5h 0min');
    expect(texto(montado)).toContain('sem volume definido');
    expect(montado.elemento.querySelector('p-progressbar')).toBeNull();
  });

  it('estouro (acima de 100%) é destacado e leva o aviso', async () => {
    const montado = await montar();
    await carregar(montado, [item(1, 50 * 60, 40)]);
    expect(montado.elemento.querySelector('.projeto-volume__linha--estouro')).not.toBeNull();
    expect(texto(montado)).toContain('(125%)');
    expect(texto(montado)).toContain('acima do esperado');
  });

  it('mês sem execução mostra 0h', async () => {
    const montado = await montar();
    await carregar(montado, [item(1, 0, 40)]);
    expect(texto(montado)).toContain('0h 0min');
    expect(texto(montado)).toContain('(0%)');
  });

  it('sem projetos: estado vazio', async () => {
    const montado = await montar();
    await carregar(montado, []);
    expect(texto(montado)).toContain('Nenhum projeto ainda');
  });

  it('mês anterior pede o mês anterior; o próximo e o "Mês atual" ficam desabilitados no mês atual e voltam a valer depois', async () => {
    const montado = await montar();
    await carregar(montado, []);
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
    await carregar(montado, []);
    montado.componente.mesControl.setValue(new Date(2026, 5, 15));
    const requisicao = esperarRequisicao(montado.http, 'GET', '/projeto/volume');
    expect([requisicao.request.params.get('ano'), requisicao.request.params.get('mes')]).toEqual(['2026', '6']);
    expect(montado.componente.mes().getDate()).toBe(1);
    responderSucesso(requisicao, []);
  });

  it('avançar no mês atual não faz nada (não há futuro)', async () => {
    const montado = await montar();
    await carregar(montado, []);
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
    expect(texto(montado)).toContain('Projeto 2');
    expect(texto(montado)).not.toContain('Projeto 1');
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
