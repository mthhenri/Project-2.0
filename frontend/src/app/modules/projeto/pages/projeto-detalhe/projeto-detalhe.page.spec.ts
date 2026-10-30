import { describe, it, expect, vi } from 'vitest';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum, TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjetoDetalhePage } from './projeto-detalhe.page';

type Montado = ComponenteMontado<ProjetoDetalhePage>;

const PROJETO = {
  id: 5, nome: 'Portal do Cliente', codigo: 'PORTAL', cor: '#336699', status: TipoProjetoStatusEnum.ATIVO,
  inicioData: null as string | null, previsaoFimData: null as string | null, createdDate: '2026-01-01T00:00:00Z',
};

const GRAFO_VAZIO = { nos: [], conexoes: [] };

async function montarDetalhe(tipo: TipoUsuarioEnum): Promise<{ montado: Montado; irPara: ReturnType<typeof vi.fn> }> {
  const rota = { snapshot: { paramMap: convertToParamMap({ id: '5' }), queryParamMap: convertToParamMap({}) } };
  const montado = await montarComponente(ProjetoDetalhePage, { usuario: tipo, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
  return { montado, irPara };
}

async function carregar(montado: Montado, projeto = PROJETO, grafo: unknown = GRAFO_VAZIO): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/5'), projeto);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), grafo);
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';

describe('ProjetoDetalhePage', () => {
  it('pede o projeto e o grafo de demandas do id da rota; mostra o esqueleto até o projeto chegar', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    expect(esperarRequisicao(montado.http, 'GET', '/demanda/grafo').request.params.get('projetoId')).toBe('5');
    esperarRequisicao(montado.http, 'GET', '/projeto/5');
  });

  it('mostra o cabeçalho do projeto e, sem demandas, o estado vazio', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    expect(texto(montado)).toContain('Portal do Cliente');
    expect(texto(montado)).toContain('PORTAL');
    expect(texto(montado)).toContain('Este projeto ainda não tem demandas');
    expect(montado.componente.resumo()).toMatchObject({ total: 0, percentual: 0, estourou: false });
  });

  it('gestor vê Nova Demanda, Relatório, Editar, Controle de horas e "Definir datas"', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    for (const esperado of ['Nova Demanda', 'Relatório', 'Editar', 'Controle de horas', 'Definir datas', 'Criar primeira demanda']) {
      expect(texto(montado), esperado).toContain(esperado);
    }
    expect(montado.elemento.querySelector('[aria-label="Trocar status do projeto"]')).not.toBeNull();
  });

  it('desenvolvedor não vê as ações de gestão nem troca de status, mas vê o projeto', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado);
    expect(texto(montado)).toContain('Portal do Cliente');
    for (const proibido of ['Nova Demanda', 'Relatório', 'Controle de horas', 'Definir datas', 'Criar primeira demanda']) {
      expect(texto(montado), proibido).not.toContain(proibido);
    }
    expect(montado.elemento.querySelector('[aria-label="Trocar status do projeto"]')).toBeNull();
  });

  it('com datas mostra início e término em formato brasileiro', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado, { ...PROJETO, inicioData: '2026-03-01', previsaoFimData: '2026-09-30' });
    expect(texto(montado)).toContain('01/03/2026');
    expect(texto(montado)).toContain('30/09/2026');
    expect(texto(montado)).not.toContain('Definir datas');
  });

  it('resumo soma executado e estimado de todas as demandas e marca o estouro a partir de 100%', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.nos.set([
      { id: 1, minutosExecutados: 60, horasEstimadas: 2 },
      { id: 2, minutosExecutados: 120, horasEstimadas: 0 },
    ] as unknown as DemandaGrafoNoDto[]);
    expect(montado.componente.resumo()).toEqual({ total: 2, minutosExecutados: 180, horasEstimadas: 2, percentual: 150, estourou: true });
    montado.componente.nos.set([{ id: 1, minutosExecutados: 30, horasEstimadas: 2 }] as unknown as DemandaGrafoNoDto[]);
    expect(montado.componente.resumo()).toMatchObject({ percentual: 25, estourou: false });
  });

  it('trocar o status muda o cabeçalho na hora e chama PUT; se a API recusa, volta ao anterior', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.alterarStatus(TipoProjetoStatusEnum.PAUSADO);
    expect(montado.componente.projeto()?.status).toBe(TipoProjetoStatusEnum.PAUSADO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/projeto/5');
    expect(requisicao.request.body).toEqual({ status: TipoProjetoStatusEnum.PAUSADO });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.projeto()?.status).toBe(TipoProjetoStatusEnum.ATIVO);
  });

  it('abrir uma visão leva às demandas com o projeto e o modo na URL; voltar leva à listagem', async () => {
    const { montado, irPara } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.abrirVisao('grafo');
    montado.componente.voltarParaListagem();
    expect(irPara).toHaveBeenNthCalledWith(1, ['/demanda'], { queryParams: { projetoId: 5, modo: 'grafo' } });
    expect(irPara).toHaveBeenNthCalledWith(2, ['/projeto']);
  });

  it('com demandas mostra a Árvore em três colunas no "Projeto inteiro", sem a visão "Lista" antiga (P-038)', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    const no = (id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto => ({
      id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 4, minutosExecutados: 0,
      demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
    });
    await carregar(montado, PROJETO, { nos: [no(1), no(2, { demandaPaiId: 1 })], arestas: [] });

    expect(montado.elemento.querySelector('app-demanda-arvore-tela')).not.toBeNull();
    expect(texto(montado)).toContain('Projeto inteiro');
    expect(texto(montado)).toContain('Demanda 2');
    expect(texto(montado)).toContain('Grafo');
    expect(montado.elemento.querySelector('[aria-label="Abrir demandas em outra visão"]')?.textContent).not.toContain('Lista');
  });

  it('falha ao carregar as demandas mostra o erro com "Tentar de novo", não "projeto sem demandas" (P-058)', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/5'), PROJETO);
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), 500, 'falhou');
    await montado.atualizar();
    expect(texto(montado)).toContain('Não foi possível carregar as demandas');
    expect(texto(montado)).not.toContain('ainda não tem demandas');
    expect(texto(montado)).not.toContain('0 demandas');

    Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Tentar de novo'))!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO_VAZIO);
    await montado.atualizar();
    expect(texto(montado)).toContain('Este projeto ainda não tem demandas');
    expect(texto(montado)).not.toContain('Não foi possível carregar');
  });

  it('projeto inexistente (404) não mostra o cabeçalho e sai do carregamento', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.DESENVOLVEDOR);
    responderErro(esperarRequisicao(montado.http, 'GET', '/projeto/5'), 404, 'Projeto não encontrado');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO_VAZIO);
    await montado.atualizar();
    expect(montado.componente.projeto()).toBeNull();
    expect(montado.componente.carregando()).toBe(false);
    expect(texto(montado)).not.toContain('Portal do Cliente');
  });
});
