import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DemandaGrafoDto, DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DemandaGrafoComponent } from './demanda-grafo.component';

// A simulação de forças do d3 roda ~5 s em timers; o teste olha os dados e as interações, não as posições, então ela
// nasce parada (sem isso, esperar a estabilização de cada teste custaria os 5 s).
type ComSimulacao = { inicializarGrafo: () => void; simulacao?: { stop: () => void } };
const prototipo = DemandaGrafoComponent.prototype as unknown as ComSimulacao;
const inicializarOriginal = prototipo.inicializarGrafo;
beforeAll(() => {
  prototipo.inicializarGrafo = function (this: ComSimulacao) {
    inicializarOriginal.call(this);
    this.simulacao?.stop();
  };
});
afterAll(() => {
  prototipo.inicializarGrafo = inicializarOriginal;
});

function criarNo(id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 2, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
  };
}

const GRAFO: DemandaGrafoDto = {
  nos: [criarNo(1, { isEstrutural: true }), criarNo(2, { demandaPaiId: 1 }), criarNo(3, { status: TipoDemandaStatusEnum.CANCELADA })],
  arestas: [
    { id: 1, origemId: 1, destinoId: 2, tipo: 'hierarquia', ehBidirecional: false },
    { id: 2, origemId: 2, destinoId: 3, tipo: 'conexao', ehBidirecional: true },
    { id: 3, origemId: 3, destinoId: 99, tipo: 'conexao', ehBidirecional: false },
  ],
};

async function montar(grafo: DemandaGrafoDto = GRAFO, extras: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(DemandaGrafoComponent, { entradas: { grafo, ...extras } });
  const selecionadas: number[] = [];
  const alternados: TipoDemandaStatusEnum[] = [];
  montado.componente.demandaSelecionada.subscribe((id) => selecionadas.push(id));
  montado.componente.statusAlternado.subscribe((status) => alternados.push(status));
  return { montado, selecionadas, alternados };
}

const svg = (elemento: HTMLElement) => elemento.querySelector('svg') as SVGSVGElement;

describe('DemandaGrafoComponent', () => {
  it('desenha um círculo e um rótulo por nó; estrutural é tracejado e menor que o raio folha invertido', async () => {
    const { montado } = await montar();
    const circulos = Array.from(svg(montado.elemento).querySelectorAll('circle.demanda-grafo__no'));
    expect(circulos).toHaveLength(3);
    const [estrutural, folha] = circulos;
    expect(estrutural.getAttribute('stroke-dasharray')).toBe('6,3');
    expect(folha.getAttribute('stroke-dasharray')).toBeNull();
    expect(Number(estrutural.getAttribute('r'))).toBeGreaterThan(Number(folha.getAttribute('r')));
    const rotulos = Array.from(svg(montado.elemento).querySelectorAll('text')).map((texto) => texto.textContent);
    expect(rotulos).toEqual(['Demanda 1', 'Demanda 2', 'Demanda 3']);
  });

  it('desenha só as arestas cujos dois nós existem (a que aponta para fora do conjunto some); conexão é tracejada, hierarquia tem seta', async () => {
    const { montado } = await montar();
    const linhas = Array.from(svg(montado.elemento).querySelectorAll('line'));
    expect(linhas).toHaveLength(2);
    const [hierarquia, conexao] = linhas;
    expect(hierarquia.getAttribute('marker-end')).toBe('url(#seta-hierarquia)');
    expect(hierarquia.getAttribute('stroke-dasharray')).toBeNull();
    expect(conexao.getAttribute('stroke-dasharray')).toBe('5,3');
    expect(conexao.getAttribute('marker-end')).toBeNull();
  });

  it('nome com mais de 24 caracteres é cortado com reticências; cancelada fica translúcida', async () => {
    const { montado } = await montar({ nos: [criarNo(1, { nome: 'N'.repeat(40) }), criarNo(2, { status: TipoDemandaStatusEnum.CANCELADA })], arestas: [] });
    const texto = svg(montado.elemento).querySelector('text')?.textContent ?? '';
    expect(texto).toBe('N'.repeat(24) + '…');
    const grupos = Array.from(svg(montado.elemento).querySelectorAll('g > g > g')) as SVGGElement[];
    expect(grupos.map((grupo) => grupo.style.opacity)).toEqual(['1', '0.4']);
  });

  it('clicar em um nó emite o id da demanda', async () => {
    const { montado, selecionadas } = await montar();
    const grupo = svg(montado.elemento).querySelectorAll('g > g > g')[1];
    grupo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selecionadas).toEqual([2]);
  });

  it('passar o mouse mostra o cartão do nó; sair o esconde', async () => {
    const { montado } = await montar();
    const grupo = svg(montado.elemento).querySelectorAll('g > g > g')[0];
    grupo.dispatchEvent(new MouseEvent('mouseover', { clientX: 10, clientY: 10 }));
    expect(montado.componente.cartao()?.no.id).toBe(1);
    expect(montado.componente.cartao()?.esquerda).toBeGreaterThanOrEqual(8);
    grupo.dispatchEvent(new MouseEvent('mouseout'));
    expect(montado.componente.cartao()).toBeNull();
  });

  it('sem nós não desenha nada; trocar o grafo redesenha do zero', async () => {
    const vazio = await montar({ nos: [], arestas: [] });
    expect(svg(vazio.montado.elemento).querySelectorAll('circle.demanda-grafo__no')).toHaveLength(0);

    const { montado } = await montar();
    montado.fixture.componentRef.setInput('grafo', { nos: [criarNo(7)], arestas: [] });
    await montado.atualizar();
    expect(Array.from(svg(montado.elemento).querySelectorAll('text')).map((texto) => texto.textContent)).toEqual(['Demanda 7']);
  });

  it('a legenda mostra os status visíveis e emite o status clicado', async () => {
    const { montado, alternados } = await montar(GRAFO, { statusVisiveis: [TipoDemandaStatusEnum.PENDENTE] });
    expect(montado.componente.statusEstaVisivel(TipoDemandaStatusEnum.PENDENTE)).toBe(true);
    expect(montado.componente.statusEstaVisivel(TipoDemandaStatusEnum.CONCLUIDA)).toBe(false);
    expect(montado.componente.itensLegenda.map((item) => item.rotulo)).toEqual(['Pendente', 'Planejada', 'Concluída', 'Cancelada']);
    montado.componente.statusAlternado.emit(TipoDemandaStatusEnum.CONCLUIDA);
    expect(alternados).toEqual([TipoDemandaStatusEnum.CONCLUIDA]);
  });

  it('o nó leva a marca do status: ponto na planejada, ✓ na concluída, risco na cancelada e nada na pendente', async () => {
    const { montado } = await montar({
      nos: [
        criarNo(1, { status: TipoDemandaStatusEnum.PENDENTE }),
        criarNo(2, { status: TipoDemandaStatusEnum.PLANEJADA }),
        criarNo(3, { status: TipoDemandaStatusEnum.CONCLUIDA }),
        criarNo(4, { status: TipoDemandaStatusEnum.CANCELADA }),
      ],
      arestas: [],
    });
    const marcasPorNo = Array.from(svg(montado.elemento).querySelectorAll('g > g > g')).map((grupo) => grupo.querySelectorAll('.demanda-grafo__marca').length);
    expect(marcasPorNo).toEqual([0, 1, 1, 1]);
    expect(svg(montado.elemento).querySelectorAll('circle.demanda-grafo__marca')).toHaveLength(1);
  });

  it('o cartão do nó mostra o nome do status ao lado da bolinha, mesmo sem horas', async () => {
    const { montado } = await montar({ nos: [criarNo(1, { status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 0, minutosExecutados: 0 })], arestas: [] });
    svg(montado.elemento).querySelector('g > g > g')!.dispatchEvent(new MouseEvent('mouseover', { clientX: 10, clientY: 10 }));
    await montado.atualizar();
    expect(montado.elemento.querySelector('.demanda-grafo__cartao-status-nome')?.textContent?.trim()).toBe('Planejada');
  });

  it('o cartão do nó usa a barra do Controle de horas e some sem horas nem execução', async () => {
    const { montado } = await montar({ nos: [criarNo(1, { horasEstimadas: 2, minutosExecutados: 60 }), criarNo(2, { horasEstimadas: 0, minutosExecutados: 0 })], arestas: [] });
    const grupos = svg(montado.elemento).querySelectorAll('g > g > g');
    grupos[0].dispatchEvent(new MouseEvent('mouseover', { clientX: 10, clientY: 10 }));
    await montado.atualizar();
    expect(montado.elemento.querySelector('.demanda-grafo__cartao app-demanda-barra-controle-horas')).not.toBeNull();
    grupos[1].dispatchEvent(new MouseEvent('mouseover', { clientX: 10, clientY: 10 }));
    await montado.atualizar();
    expect(montado.elemento.querySelector('.demanda-grafo__cartao app-demanda-barra-controle-horas')).toBeNull();
  });

  it('sempre mostra o projeto todo: sem foco por pasta, e clicar numa pasta ou numa demanda abre na Árvore', async () => {
    const nos = [criarNo(1, { isEstrutural: true }), criarNo(2, { demandaPaiId: 1 }), criarNo(3)];
    const { montado, selecionadas } = await montar({ nos, arestas: [] });
    const grupos = Array.from(svg(montado.elemento).querySelectorAll('g > g > g')) as SVGGElement[];
    expect(new Set(grupos.map((grupo) => grupo.style.opacity || '1'))).toEqual(new Set(['1']));
    expect(montado.elemento.querySelector('.demanda-grafo__foco')).toBeNull();
    grupos[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    grupos[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selecionadas).toEqual([1, 2]);
  });

  it('o filtro esmaece os nós e as arestas que não atendem, sem tirá-los nem redesenhar o grafo', async () => {
    const { montado } = await montar();
    const opacidades = () => (Array.from(svg(montado.elemento).querySelectorAll('g > g > g')) as SVGGElement[]).map((grupo) => grupo.style.opacity);
    const opacidadesArestas = () => (Array.from(svg(montado.elemento).querySelectorAll('line')) as SVGLineElement[]).map((linha) => linha.style.opacity);
    const circuloAntes = svg(montado.elemento).querySelector('circle.demanda-grafo__no');
    expect(opacidades()).toEqual(['1', '1', '0.4']);

    montado.fixture.componentRef.setInput('idsEmDestaque', new Set([1, 2]));
    await montado.atualizar();
    expect(opacidades()).toEqual(['1', '1', '0.25']);
    expect(opacidadesArestas()).toEqual(['1', '0.25']);
    expect(svg(montado.elemento).querySelectorAll('circle.demanda-grafo__no')).toHaveLength(3);
    expect(svg(montado.elemento).querySelector('circle.demanda-grafo__no')).toBe(circuloAntes);

    montado.fixture.componentRef.setInput('idsEmDestaque', new Set<number>());
    await montado.atualizar();
    expect(opacidades()).toEqual(['0.25', '0.25', '0.25']);

    montado.fixture.componentRef.setInput('idsEmDestaque', null);
    await montado.atualizar();
    expect(opacidades()).toEqual(['1', '1', '0.4']);
  });

  it('o nó esmaecido pelo filtro continua abrindo a demanda ao clicar', async () => {
    const { montado, selecionadas } = await montar(GRAFO, { idsEmDestaque: new Set([1]) });
    const grupo = svg(montado.elemento).querySelectorAll('g > g > g')[1] as SVGGElement;
    expect(grupo.style.opacity).toBe('0.25');
    grupo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selecionadas).toEqual([2]);
  });

  it('destruir o componente para a simulação (sem timers soltos)', async () => {
    const { montado } = await montar();
    expect(() => montado.fixture.destroy()).not.toThrow();
    expect(montado.componente.cartao()).toBeNull();
  });

  // P-060: o enquadramento do primeiro quadro acontece com o layout ainda se assentando; ao terminar a simulação enquadra de novo.
  describe('enquadramento ao assentar', () => {
    type Interno = { ajustarAoGrafo: () => void; zoomManual: boolean; simulacao: { on: (evento: string) => () => void } };

    it('reenquadra uma vez quando a simulação termina', async () => {
      const { montado } = await montar();
      const interno = montado.componente as unknown as Interno;
      const ajustar = vi.spyOn(interno, 'ajustarAoGrafo').mockImplementation(() => undefined);
      interno.simulacao.on('end')();
      interno.simulacao.on('end')();
      expect(ajustar).toHaveBeenCalledTimes(1);
    });

    it('não reenquadra se a pessoa já mexeu no zoom ou arrastou', async () => {
      const { montado } = await montar();
      const interno = montado.componente as unknown as Interno;
      const ajustar = vi.spyOn(interno, 'ajustarAoGrafo').mockImplementation(() => undefined);
      interno.zoomManual = true;
      interno.simulacao.on('end')();
      expect(ajustar).not.toHaveBeenCalled();
    });
  });
});
