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
    expect(montado.elemento.textContent).toContain('Nenhuma demanda em aberto');
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
  describe('botão direito', () => {
    const opcoes = (montado: { componente: MinhasDemandasComponent }) => montado.componente.itensMenu();

    it('desenvolvedor: menu com Alterar status e Sair da demanda; o status atual vem desabilitado', async () => {
      const montado = await montar();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
      await montado.atualizar();
      montado.elemento.querySelector('li')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const itens = opcoes(montado);
      expect(itens.map((item) => item.label).filter(Boolean)).toEqual(['Alterar status', 'Sair da demanda']);
      expect(itens[0].items!.filter((item) => item.disabled).map((item) => item.label)).toEqual(['Pendente']);
    });

    it('mostra uma marca colorida para cada status no menu', async () => {
      const montado = await montar();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
      await montado.atualizar();
      montado.elemento.querySelector('li')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const estados = opcoes(montado)[0].items!;
      expect(estados.every((item) => item.icon === 'pi pi-circle-fill' && !!item.iconStyle?.['color'])).toBe(true);
    });

    it('trocar para Concluída tira a demanda da lista; para Planejada só muda o status', async () => {
      const montado = await montar();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1), demanda(2)]);
      await montado.atualizar();
      montado.componente.alterarStatus(montado.componente.itens()[0], TipoDemandaStatusEnum.PLANEJADA);
      responderSucesso(esperarRequisicao(montado.http, 'PUT', '/demanda/1'), {});
      expect(montado.componente.itens()[0].status).toBe(TipoDemandaStatusEnum.PLANEJADA);
      montado.componente.alterarStatus(montado.componente.itens()[1], TipoDemandaStatusEnum.CONCLUIDA);
      responderSucesso(esperarRequisicao(montado.http, 'PUT', '/demanda/2'), {});
      expect(montado.componente.itens().map((item) => item.demandaId)).toEqual([1]);
    });

    it('status recusado pela API volta a lista como estava', async () => {
      const montado = await montar();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
      await montado.atualizar();
      montado.componente.alterarStatus(montado.componente.itens()[0], TipoDemandaStatusEnum.CANCELADA);
      expect(montado.componente.itens()).toHaveLength(0);
      responderErro(esperarRequisicao(montado.http, 'PUT', '/demanda/1'), 403, 'Negado');
      expect(montado.componente.itens()).toHaveLength(1);
    });

    it('Sair da demanda remove o próprio usuário e tira a demanda da lista', async () => {
      const montado = await montar();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
      await montado.atualizar();
      montado.componente.sair(montado.componente.itens()[0]);
      expect(montado.componente.itens()).toHaveLength(0);
      responderSucesso(montado.http.expectOne((requisicao) => requisicao.method === 'DELETE' && requisicao.url.includes('/demanda/1/membro/')), null);
    });

    it('gestor não tem Sair da demanda (não é membro)', async () => {
      const montado = await montarComponente(MinhasDemandasComponent, { usuario: TipoUsuarioEnum.GESTOR });
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [demanda(1)]);
      await montado.atualizar();
      montado.elemento.querySelector('li')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      expect(opcoes(montado).map((item) => item.label).filter(Boolean)).toEqual(['Alterar status']);
    });
  });
});
