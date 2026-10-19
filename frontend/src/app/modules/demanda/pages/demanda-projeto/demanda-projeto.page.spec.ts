import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DemandaProjetoPage } from './demanda-projeto.page';
import { FILTRO_VAZIO } from '../../utils/demanda-filtro.util';

type Montado = ComponenteMontado<DemandaProjetoPage>;

const PROJETOS = [
  { id: 5, nome: 'Portal', codigo: 'PORTAL', cor: '#336699' },
  { id: 6, nome: 'App', codigo: 'APP', cor: '#993366' },
];

function criarNo(id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 4, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
  };
}

const GRAFO = { nos: [criarNo(1), criarNo(2, { demandaPaiId: 1, status: TipoDemandaStatusEnum.CONCLUIDA })], arestas: [] };

interface OpcoesPagina {
  usuario?: TipoUsuarioEnum;
  consulta?: Record<string, string>;
  armazenamento?: Record<string, string>;
}

async function montarPagina({ usuario = TipoUsuarioEnum.GESTOR, consulta = {}, armazenamento }: OpcoesPagina = {}) {
  TestBed.resetTestingModule();
  const rota = { snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap(consulta) } };
  const montado = await montarComponente(DemandaProjetoPage, { usuario, armazenamento, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
  return { montado, irPara };
}

const requisicaoProjetos = (montado: Montado) => montado.http.expectOne((r) => r.method === 'GET' && /\/projeto(\?|$)/.test(r.url));

async function carregarProjetos(montado: Montado, projetos = PROJETOS): Promise<void> {
  responderSucesso(requisicaoProjetos(montado), { itens: projetos, total: projetos.length, pagina: 1, itensPorPagina: 100 });
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';

describe('DemandaProjetoPage', () => {
  it('pede os projetos ao abrir; com mais de um e sem contexto lembrado, espera a escolha (nada de grafo)', async () => {
    const { montado } = await montarPagina();
    const requisicao = requisicaoProjetos(montado);
    expect(requisicao.request.params.get('itensPorPagina')).toBe('100');
    expect(montado.componente.carregandoProjetos()).toBe(true);
    responderSucesso(requisicao, { itens: PROJETOS, total: 2, pagina: 1, itensPorPagina: 100 });
    await montado.atualizar();
    expect(montado.componente.carregandoProjetos()).toBe(false);
    expect(montado.componente.projetoId()).toBe(0);
    montado.http.expectNone((r) => r.url.endsWith('/demanda/grafo'));
  });

  it('com um único projeto, seleciona-o sozinho e carrega o grafo; o contexto vai para a URL e o armazenamento', async () => {
    const { montado, irPara } = await montarPagina();
    await carregarProjetos(montado, [PROJETOS[0]]);
    expect(montado.componente.projetoId()).toBe(5);
    expect(esperarRequisicao(montado.http, 'GET', '/demanda/grafo').request.params.get('projetoId')).toBe('5');
    expect(localStorage.getItem('demanda.ultimoProjetoId')).toBe('5');
    expect(irPara).toHaveBeenCalledWith([], { queryParams: { modo: 'lista', projetoId: 5 }, replaceUrl: true });
  });

  it('com vários projetos e nenhum lembrado, não escolhe nenhum; o projeto lembrado só vale se ainda existir', async () => {
    const semLembrado = await montarPagina();
    await carregarProjetos(semLembrado.montado);
    expect(semLembrado.montado.componente.projetoId()).toBe(0);
    semLembrado.montado.http.expectNone((r) => r.url.endsWith('/demanda/grafo'));

    const lembrado = await montarPagina({ armazenamento: { 'demanda.ultimoProjetoId': '6' } });
    await carregarProjetos(lembrado.montado);
    expect(lembrado.montado.componente.projetoId()).toBe(6);
    esperarRequisicao(lembrado.montado.http, 'GET', '/demanda/grafo');

    const inexistente = await montarPagina({ armazenamento: { 'demanda.ultimoProjetoId': '99' } });
    await carregarProjetos(inexistente.montado);
    expect(inexistente.montado.componente.projetoId()).toBe(0);
  });

  it('?projetoId= na URL vence o projeto lembrado', async () => {
    const { montado } = await montarPagina({ consulta: { projetoId: '5' }, armazenamento: { 'demanda.ultimoProjetoId': '6' } });
    await carregarProjetos(montado);
    expect(montado.componente.projetoId()).toBe(5);
    esperarRequisicao(montado.http, 'GET', '/demanda/grafo');
  });

  it('escolher o projeto carrega o grafo dele e zera filtros e planejamento', async () => {
    const { montado } = await montarPagina();
    await carregarProjetos(montado);
    montado.componente.aoAlterarFiltro({ ...FILTRO_VAZIO, termo: 'x' });
    montado.componente.projetoControle.setValue(6);
    expect(montado.componente.projetoId()).toBe(6);
    expect(montado.componente.filtro()).toEqual(FILTRO_VAZIO);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO);
    await montado.atualizar();
    expect(montado.componente.projetoTemDemandas()).toBe(true);
    expect(montado.componente.arvoreRaizes().map((raiz) => raiz.id)).toEqual([1]);
  });

  it('falha ao carregar projetos ou grafo avisa o usuário', async () => {
    const { montado } = await montarPagina();
    const avisos: string[] = [];
    montado.mensagens.add = ((mensagem: { detail: string }) => avisos.push(mensagem.detail)) as never;
    responderErro(requisicaoProjetos(montado), 500, 'falhou');
    expect(avisos).toContain('Não foi possível carregar os projetos');

    const outra = await montarPagina({ consulta: { projetoId: '5' } });
    const avisosGrafo: string[] = [];
    outra.montado.mensagens.add = ((mensagem: { detail: string }) => avisosGrafo.push(mensagem.detail)) as never;
    await carregarProjetos(outra.montado);
    responderErro(esperarRequisicao(outra.montado.http, 'GET', '/demanda/grafo'), 500, 'falhou');
    expect(avisosGrafo).toContain('Não foi possível carregar as demandas');
  });

  describe('modos', () => {
    it('padrão é a lista; o gestor tem Lista, Grafo e Planejamento; o desenvolvedor só Lista e Grafo', async () => {
      const gestor = await montarPagina();
      expect(gestor.montado.componente.modoVisualizacao()).toBe('lista');
      expect(gestor.montado.componente.opcoesModo().map((opcao) => opcao.valor)).toEqual(['lista', 'grafo', 'planejamento']);
      const dev = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
      expect(dev.montado.componente.opcoesModo().map((opcao) => opcao.valor)).toEqual(['lista', 'grafo']);
    });

    it('?modo= vence o último modo lembrado; valor inválido volta para a lista', async () => {
      expect((await montarPagina({ consulta: { modo: 'grafo' }, armazenamento: { 'demanda.ultimoModo': 'lista' } })).montado.componente.modoVisualizacao()).toBe('grafo');
      expect((await montarPagina({ armazenamento: { 'demanda.ultimoModo': 'grafo' } })).montado.componente.modoVisualizacao()).toBe('grafo');
      expect((await montarPagina({ consulta: { modo: 'qualquer' } })).montado.componente.modoVisualizacao()).toBe('lista');
    });

    it('o desenvolvedor nunca cai no planejamento, nem por URL nem por armazenamento', async () => {
      const porUrl = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, consulta: { modo: 'planejamento' } });
      expect(porUrl.montado.componente.modoVisualizacao()).toBe('lista');
      const porArmazenamento = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, armazenamento: { 'demanda.ultimoModo': 'planejamento' } });
      expect(porArmazenamento.montado.componente.modoVisualizacao()).toBe('lista');
    });

    it('o desenvolvedor que força o modo planejamento não dispara a consulta', async () => {
      const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, consulta: { projetoId: '5' } });
      await carregarProjetos(montado);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO);
      montado.componente.alternarModo('planejamento');
      montado.http.expectNone((r) => r.url.endsWith('/demanda/planejamento'));
    });

    it('o gestor, ao trocar para planejamento, carrega as linhas; o mesmo modo é ignorado; o modo vai para URL e armazenamento', async () => {
      const { montado, irPara } = await montarPagina({ consulta: { projetoId: '5' } });
      await carregarProjetos(montado);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO);
      montado.componente.alternarModo('lista');
      montado.http.expectNone((r) => r.url.endsWith('/demanda/planejamento'));

      montado.componente.alternarModo('planejamento');
      expect(localStorage.getItem('demanda.ultimoModo')).toBe('planejamento');
      expect(irPara).toHaveBeenLastCalledWith([], { queryParams: { modo: 'planejamento', projetoId: 5 }, replaceUrl: true });
      const requisicao = esperarRequisicao(montado.http, 'GET', '/demanda/planejamento');
      expect(requisicao.request.params.get('projetoId')).toBe('5');
      responderSucesso(requisicao, [{ demandaId: 1, caminho: 'Demanda 1', executoresAtivos: [{ usuarioId: 3, nomeCompleto: 'Ana' }] }]);
      expect(montado.componente.planejamento()).toHaveLength(1);
      expect(montado.componente.executoresPorDemanda().get(1)).toEqual(['Ana']);
    });

    it('falha ao carregar o planejamento avisa o usuário', async () => {
      const { montado } = await montarPagina({ consulta: { projetoId: '5', modo: 'planejamento' } });
      const avisos: string[] = [];
      montado.mensagens.add = ((mensagem: { detail: string }) => avisos.push(mensagem.detail)) as never;
      await carregarProjetos(montado);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO);
      responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/planejamento'), 500, 'falhou');
      expect(avisos).toContain('Não foi possível carregar o planejamento');
    });
  });

  describe('Nova Demanda e atalhos', () => {
    async function comProjeto(usuario: TipoUsuarioEnum) {
      const contexto = await montarPagina({ usuario, consulta: { projetoId: '5' } });
      await carregarProjetos(contexto.montado);
      responderSucesso(esperarRequisicao(contexto.montado.http, 'GET', '/demanda/grafo'), { nos: [], arestas: [] });
      await contexto.montado.atualizar();
      return contexto.montado;
    }

    it('o gestor vê "Nova Demanda"; o desenvolvedor não', async () => {
      expect(texto(await comProjeto(TipoUsuarioEnum.GESTOR))).toContain('Nova Demanda');
      expect(texto(await comProjeto(TipoUsuarioEnum.DESENVOLVEDOR))).not.toContain('Nova Demanda');
    });

    it('C abre a criação só para o gestor; com campo em foco, modificador ou sem projeto nada acontece', async () => {
      const gestor = await comProjeto(TipoUsuarioEnum.GESTOR);
      const tecla = (key: string, extras: Partial<KeyboardEvent> = {}) => {
        const evento = { key, preventDefault: () => undefined, defaultPrevented: false, target: document.body, ...extras } as KeyboardEvent;
        gestor.componente.aoTeclar(evento);
      };
      tecla('c', { ctrlKey: true });
      tecla('c', { target: document.createElement('input') });
      expect(gestor.componente.mostrarDialogNovaDemanda()).toBe(false);
      tecla('c');
      expect(gestor.componente.mostrarDialogNovaDemanda()).toBe(true);

      const dev = await comProjeto(TipoUsuarioEnum.DESENVOLVEDOR);
      dev.componente.aoTeclar({ key: 'c', preventDefault: () => undefined, defaultPrevented: false, target: document.body } as unknown as KeyboardEvent);
      expect(dev.componente.mostrarDialogNovaDemanda()).toBe(false);

      const semProjeto = await montarPagina();
      semProjeto.montado.componente.aoTeclar({ key: 'c', preventDefault: () => undefined, defaultPrevented: false, target: document.body } as unknown as KeyboardEvent);
      expect(semProjeto.montado.componente.mostrarDialogNovaDemanda()).toBe(false);
    });
  });

  describe('estado derivado', () => {
    async function comGrafo(grafo: unknown = GRAFO, usuario = TipoUsuarioEnum.GESTOR) {
      const { montado, irPara } = await montarPagina({ usuario, consulta: { projetoId: '5' } });
      await carregarProjetos(montado);
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), grafo);
      await montado.atualizar();
      return { montado, irPara };
    }

    it('contagem por status, tags do projeto (únicas e ordenadas) e árvore a partir do grafo', async () => {
      const tagB = { id: 2, nome: 'Beta', cor: '#222222' };
      const tagA = { id: 1, nome: 'Alfa', cor: '#111111' };
      const { montado } = await comGrafo({
        nos: [criarNo(1, { tags: [tagB, tagA] }), criarNo(2, { demandaPaiId: 1, tags: [tagA], status: TipoDemandaStatusEnum.CONCLUIDA })], arestas: [],
      });
      expect(montado.componente.tagsDoProjeto().map((tag) => tag.nome)).toEqual(['Alfa', 'Beta']);
      expect(montado.componente.contagemPorStatus()).toMatchObject({ PENDENTE: 1, CONCLUIDA: 1 });
      expect(montado.componente.arvoreRaizes()[0].filhos.map((filho) => filho.id)).toEqual([2]);
    });

    it('o filtro de status recorta a árvore e o grafo exibido (este com atraso de 200 ms)', async () => {
      vi.useFakeTimers();
      try {
        const { montado } = await comGrafo();
        montado.componente.alternarStatusVisivel(TipoDemandaStatusEnum.CONCLUIDA);
        expect(montado.componente.filtro().status).not.toContain(TipoDemandaStatusEnum.CONCLUIDA);
        expect(montado.componente.grafoExibido()?.nos).toHaveLength(2);
        vi.advanceTimersByTime(250);
        expect(montado.componente.grafoExibido()?.nos.map((no) => no.id)).toEqual([1]);
        montado.componente.limparFiltros();
        vi.advanceTimersByTime(250);
        expect(montado.componente.grafoExibido()?.nos).toHaveLength(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('aoStatusAlterado aplica no grafo e no planejamento; concluída sai do planejamento', async () => {
      const { montado } = await comGrafo();
      montado.componente.planejamento.set([{ demandaId: 1, status: TipoDemandaStatusEnum.PENDENTE }, { demandaId: 2, status: TipoDemandaStatusEnum.PLANEJADA }] as never);
      montado.componente.aoStatusAlterado({ demandaId: 1, status: TipoDemandaStatusEnum.PLANEJADA });
      expect(montado.componente.grafo()?.nos.find((no) => no.id === 1)?.status).toBe(TipoDemandaStatusEnum.PLANEJADA);
      expect(montado.componente.planejamento().find((linha) => linha.demandaId === 1)?.status).toBe(TipoDemandaStatusEnum.PLANEJADA);
      montado.componente.aoStatusAlterado({ demandaId: 2, status: TipoDemandaStatusEnum.CONCLUIDA });
      expect(montado.componente.planejamento().map((linha) => linha.demandaId)).toEqual([1]);
      montado.http.expectNone(() => true);
    });

    it('aoTagsAlteradas atualiza só o nó, sem recarregar; aoAlteradoPlanejamento recarrega o grafo', async () => {
      const { montado } = await comGrafo();
      montado.componente.aoTagsAlteradas({ demandaId: 2, tags: [{ id: 9, nome: 'Nova', cor: '#999999' }] });
      expect(montado.componente.grafo()?.nos.find((no) => no.id === 2)?.tags).toHaveLength(1);
      expect(montado.componente.grafo()?.nos.find((no) => no.id === 1)?.tags).toHaveLength(0);
      montado.http.expectNone(() => true);

      montado.componente.aoAlteradoPlanejamento();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/grafo'), GRAFO);
      montado.http.expectNone((r) => r.url.endsWith('/demanda/planejamento'));
    });

    it('navegar para o projeto leva ao detalhe; sem projeto leva à lista', async () => {
      const { montado, irPara } = await comGrafo();
      montado.componente.navegarParaProjeto();
      expect(irPara).toHaveBeenLastCalledWith(['/projeto', 5]);
      const semProjeto = await montarPagina();
      semProjeto.montado.componente.navegarParaProjeto();
      expect(semProjeto.irPara).toHaveBeenCalledWith(['/projeto']);
    });
  });
});
