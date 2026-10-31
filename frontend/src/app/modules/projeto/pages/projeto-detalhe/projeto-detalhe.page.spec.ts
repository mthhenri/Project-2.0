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
  });

  it('o cabeçalho leva a cor do projeto na faixa do topo e no selo com a sigla do nome', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    const faixa = montado.elemento.querySelector('.projeto-detalhe__faixa') as HTMLElement;
    const selo = montado.elemento.querySelector('.projeto-detalhe__selo') as HTMLElement;
    expect(faixa.style.backgroundColor).toBe('rgb(51, 102, 153)');
    expect(selo.style.backgroundColor).toBe('rgb(51, 102, 153)');
    expect(selo.textContent?.trim()).toBe('PC');
  });

  it('gestor vê Nova Demanda, Relatório e Configurar volume no cabeçalho, e não o antigo Editar, o Grafo nem a faixa de resumo', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    for (const esperado of ['Nova Demanda', 'Relatório', 'Configurar volume', 'Criar primeira demanda']) {
      expect(texto(montado), esperado).toContain(esperado);
    }
    const rotulosDosBotoes = Array.from(montado.elemento.querySelectorAll('.projeto-detalhe__cabecalho-acoes button')).map((botao) => botao.textContent?.trim());
    expect(rotulosDosBotoes).not.toContain('Editar');
    expect(rotulosDosBotoes).not.toContain('Grafo');
    expect(rotulosDosBotoes).not.toContain('Controle de horas');
    expect(texto(montado)).not.toContain('Executado');
    expect(montado.elemento.querySelector('.projeto-detalhe__resumo')).toBeNull();
    expect(montado.elemento.querySelector('[aria-label="Trocar status do projeto"]')).not.toBeNull();
  });

  it('desenvolvedor não vê as ações de gestão nem troca de status, mas vê o projeto', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado);
    expect(texto(montado)).toContain('Portal do Cliente');
    for (const proibido of ['Nova Demanda', 'Relatório', 'Configurar volume', 'Criar primeira demanda']) {
      expect(texto(montado), proibido).not.toContain(proibido);
    }
    expect(montado.elemento.querySelector('[aria-label="Trocar status do projeto"]')).toBeNull();
  });

  it('com datas mostra início e término em formato brasileiro', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado, { ...PROJETO, inicioData: '2026-03-01', previsaoFimData: '2026-09-30' });
    expect(texto(montado)).toContain('01/03/2026');
    expect(texto(montado)).toContain('30/09/2026');
    expect(texto(montado)).toContain('Início: 01/03/2026');
    expect(texto(montado)).toContain('Fim: 30/09/2026');
  });

  it('sem datas mostra "Início: indefinido" e "Fim: indefinido"', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    expect(texto(montado)).toContain('Início: indefinido');
    expect(texto(montado)).toContain('Fim: indefinido');
  });

  it('trocar o status muda o cabeçalho na hora e chama PUT; se a API recusa, volta ao anterior', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.alterarCampo({ status: TipoProjetoStatusEnum.PAUSADO });
    expect(montado.componente.projeto()?.status).toBe(TipoProjetoStatusEnum.PAUSADO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/projeto/5');
    expect(requisicao.request.body).toEqual({ status: TipoProjetoStatusEnum.PAUSADO });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.projeto()?.status).toBe(TipoProjetoStatusEnum.ATIVO);
  });

  it('alterar o nome, a cor ou uma data muda o cabeçalho na hora e chama PUT só com o campo; recusa da API desfaz', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.alterarCampo({ nome: 'Portal Novo', cor: '#ff0000', inicioData: '2026-03-01' });
    expect(montado.componente.projeto()).toMatchObject({ nome: 'Portal Novo', cor: '#ff0000', inicioData: '2026-03-01' });
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/projeto/5');
    expect(requisicao.request.body).toEqual({ nome: 'Portal Novo', cor: '#ff0000', inicioData: '2026-03-01' });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.projeto()).toMatchObject({ nome: 'Portal do Cliente', cor: '#336699', inicioData: null });
  });

  it('previsão de fim igual ou anterior ao início não chega à API', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado, { ...PROJETO, inicioData: '2026-03-01' });
    montado.componente.alterarCampo({ previsaoFimData: '2026-03-01' });
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    expect(montado.componente.projeto()?.previsaoFimData).toBeNull();
  });

  it('"Configurar volume" abre o dialog do volume esperado do projeto', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Configurar volume'))!.click();
    await montado.atualizar();
    expect(esperarRequisicao(montado.http, 'GET', '/projeto/5/volume-vigencia')).toBeTruthy();
    expect(document.body.textContent).toContain('Volume esperado');
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
  });

  const noDeTeste = (id: number): DemandaGrafoNoDto => ({
    id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 4, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [],
  });
  const iconesDeVisao = (montado: Montado) =>
    Array.from(montado.elemento.querySelectorAll('.demanda-toolbar [slotVisoes] button')).map((botao) => botao.getAttribute('aria-label'));

  it('Grafo e Controle de horas são ícones no fim da barra de busca, com o gestor chegando ao Controle de horas', async () => {
    const gestor = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(gestor.montado, PROJETO, { nos: [noDeTeste(1)], arestas: [] });
    expect(iconesDeVisao(gestor.montado)).toEqual(['Grafo', 'Controle de horas']);
    (gestor.montado.elemento.querySelector('[aria-label="Controle de horas"]') as HTMLElement).click();
    expect(gestor.irPara).toHaveBeenCalledWith(['/demanda'], { queryParams: { projetoId: 5, modo: 'controle-de-horas' } });
  });

  it('o desenvolvedor só vê o ícone do Grafo na barra de busca', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, PROJETO, { nos: [noDeTeste(1)], arestas: [] });
    expect(iconesDeVisao(montado)).toEqual(['Grafo']);
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

describe('ProjetoDetalhePage: demandas ou volume (tasks 290 e 291)', () => {
  const anual = { projetoId: 5, nome: 'Portal do Cliente', codigo: 'PORTAL', cor: '#336699', volumeEsperadoHorasPorMes: new Array(12).fill(40), minutosGastosPorMes: new Array(12).fill(0) };
  const demandasOcultas = (montado: Montado) => montado.elemento.querySelector('.projeto-detalhe__demandas--oculto');

  it('o gestor abre vendo as demandas, e o volume só aparece ao trocar', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    expect(montado.componente.visaoAtual()).toBe('DEMANDAS');
    expect(montado.elemento.querySelector('.projeto-detalhe__cabecalho-acoes p-selectbutton')).not.toBeNull();
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();
    montado.http.expectNone((requisicao) => requisicao.url.includes('/projeto/volume'));
  });

  it('trocar para Volume mostra o gráfico anual do projeto e esconde as demandas (sem desmontá-las); voltar as mostra', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.escolherVisao('VOLUME');
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/volume/anual'), [anual]);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-projeto-volume app-grafico-barras')).not.toBeNull();
    expect(demandasOcultas(montado)).not.toBeNull();

    montado.componente.escolherVisao('DEMANDAS');
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();
    expect(demandasOcultas(montado)).toBeNull();
    expect(montado.elemento.querySelector('.projeto-detalhe__demandas')).not.toBeNull();
  });

  it('a escolha fica lembrada neste navegador', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.GESTOR);
    await carregar(montado);
    montado.componente.escolherVisao('VOLUME');
    expect(localStorage.getItem('projeto.detalhe.visao')).toBe('VOLUME');
  });

  it('desenvolvedor: sem o seletor, sempre as demandas, e nunca pede o volume (mesmo com a escolha guardada)', async () => {
    const { montado } = await montarDetalhe(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado);
    montado.componente.visao.set('VOLUME');
    await montado.atualizar();
    expect(montado.componente.visaoAtual()).toBe('DEMANDAS');
    expect(montado.elemento.querySelector('p-selectbutton')).toBeNull();
    expect(montado.elemento.querySelector('app-projeto-volume')).toBeNull();
    montado.http.expectNone((requisicao) => requisicao.url.includes('/projeto/volume'));
  });
});
