import { describe, expect, it, vi } from 'vitest';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente } from '../../../../../testes/montar-componente';
import { MinhasDemandasComponent } from './minhas-demandas.component';

// "Minhas demandas" (task 245): a lista das últimas demandas executadas, com os estados vazio, carregando, cheio e erro, e a abertura
// automática da demanda em que há execução rodando.

function demanda(id: number, sobrescrita: Record<string, unknown> = {}) {
  return {
    demandaId: id, nome: `Demanda ${id}`, caminho: `Raiz › Demanda ${id}`, projetoId: 3, nomeProjeto: 'Portal', status: TipoDemandaStatusEnum.PENDENTE,
    horasEstimadas: 8, minutosExecutados: 120, totalAtividades: 4, atividadesDesenvolvidas: 1, executando: false, ultimaExecucaoData: '2026-10-25T12:00:00.000Z',
    ...sobrescrita,
  };
}

async function montar() {
  return montarComponente(MinhasDemandasComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
}

describe('MinhasDemandasComponent', () => {
  it('mostra o esqueleto enquanto carrega', async () => {
    const montado = await montar();
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), []);
    await montado.atualizar();
    expect(montado.elemento.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('sem demandas, explica o que aparece ali', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), []);
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Nenhuma demanda ainda');
  });

  it('cheio: cada demanda mostra o projeto e o caminho, a barra de horas e quantas atividades estão desenvolvidas', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1), demanda(2, { totalAtividades: 0, atividadesDesenvolvidas: 0 })]);
    await montado.atualizar();
    const texto = montado.elemento.textContent ?? '';
    expect(texto).toContain('Demanda 1');
    expect(texto).toContain('Portal › Raiz › Demanda 1');
    expect(texto).toContain('1 de 4 desenvolvidas');
    expect(texto).toContain('Sem atividades');
    expect(montado.elemento.querySelectorAll('app-demanda-barra-horas').length).toBe(2);
  });

  it('erro: avisa e oferece tentar de novo', async () => {
    const montado = await montar();
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), 500, 'Falha');
    await montado.atualizar();
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar as demandas');
    montado.elemento.querySelector<HTMLButtonElement>('.minhas-demandas__estado button')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Demanda 1');
  });

  it('clicar numa demanda emite o id dela', async () => {
    const montado = await montar();
    const escolhida = vi.fn();
    montado.componente.escolhida.subscribe(escolhida);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(7)]);
    await montado.atualizar();
    montado.elemento.querySelector<HTMLButtonElement>('.minhas-demandas__item')!.click();
    expect(escolhida).toHaveBeenCalledWith(7);
  });

  it('com execução rodando, avisa uma vez qual demanda abrir e marca o item como rodando', async () => {
    const montado = await montar();
    const emExecucao = vi.fn();
    montado.componente.emExecucaoEncontrada.subscribe(emExecucao);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1), demanda(2, { executando: true })]);
    await montado.atualizar();
    expect(emExecucao).toHaveBeenCalledTimes(1);
    expect(emExecucao).toHaveBeenCalledWith(2);
    expect(montado.elemento.querySelectorAll('.minhas-demandas__item--rodando').length).toBe(1);

    montado.componente.carregar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(2, { executando: true })]);
    await montado.atualizar();
    expect(emExecucao).toHaveBeenCalledTimes(1);
  });

  it('sem execução rodando, não pede para abrir nenhuma', async () => {
    const montado = await montar();
    const emExecucao = vi.fn();
    montado.componente.emExecucaoEncontrada.subscribe(emExecucao);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
    await montado.atualizar();
    expect(emExecucao).not.toHaveBeenCalled();
  });
});
