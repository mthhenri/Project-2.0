import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  ElementRef,
  inject,
  signal,
  computed,
  SimpleChanges,
} from '@angular/core';
import * as d3 from 'd3';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import {
  DemandaGrafoDto,
  DemandaGrafoNoDto,
  DemandaGrafoArestaDto,
  TipoDemandaStatusEnum,
} from '@project20/shared';
import { COR_NO_BORDA, OPCOES_STATUS_DEMANDA, ROTULO_STATUS_DEMANDA, corPreenchimentoNo } from '../../constants/demanda-cores.constants';
import { PastaId } from '../../utils/demanda-pasta.util';
import { idsDoFoco, pastaAcimaDoFoco, subpastasDoFoco } from '../../utils/demanda-foco-grafo.util';
import { DemandaBarraControleHorasComponent } from '../demanda-barra-controle-horas/demanda-barra-controle-horas.component';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';
import { DemandaStatusMarcaComponent } from '../demanda-status-marca/demanda-status-marca.component';

/** Nó sob o mouse: posição do cartão flutuante em coordenadas do componente. */
interface CartaoNo {
  no: DemandaGrafoNoDto;
  esquerda: number;
  topo: number;
}

const TODOS_OS_STATUS = Object.values(TipoDemandaStatusEnum);

/**
 * Grafo de demandas (d3) integrado ao tema (task 107): cores por tokens, cartão no hover, legenda em popover
 * cujos status filtram o grafo e controles de zoom. Os filtros da toolbar chegam já aplicados em `grafo`.
 *
 * Task 241: o nó leva a marca do status, o cartão usa a barra do Controle de horas, o clique abre a demanda na Árvore e o clique numa pasta troca
 * o **foco**. O foco é a pasta escolhida (a mesma das outras visões) com tudo que está dentro; o resto fica apagado, sem clique, e o layout não muda.
 */
@Component({
  selector: 'app-demanda-grafo',
  standalone: true,
  imports: [ButtonModule, PopoverModule, TooltipModule, DemandaStatusComponent, DemandaStatusMarcaComponent, DemandaBarraControleHorasComponent],
  templateUrl: './demanda-grafo.component.html',
  styleUrls: ['./demanda-grafo.component.scss'],
})
export class DemandaGrafoComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) grafo!: DemandaGrafoDto;
  /** Status exibidos (a legenda mostra os demais como desligados). */
  @Input() statusVisiveis: TipoDemandaStatusEnum[] = TODOS_OS_STATUS;
  /** Todas as demandas do projeto, sem o filtro da toolbar: o foco parte delas (o filtro recorta depois). Vazio: vale `grafo.nos`. */
  @Input() todosOsNos: DemandaGrafoNoDto[] = [];
  /** A pasta em foco (`null` é "Sem pasta"); sem ela o grafo mostra o projeto inteiro. */
  @Input() pastaId: PastaId | undefined = undefined;
  @Output() demandaSelecionada = new EventEmitter<number>();
  /** Clicou numa pasta, ou escolheu uma nos botões de foco: quem hospeda troca a pasta das três visões. */
  @Output() pastaChange = new EventEmitter<PastaId>();
  /** Um status da legenda foi clicado (liga/desliga): quem hospeda aplica no filtro da toolbar. */
  @Output() statusAlternado = new EventEmitter<TipoDemandaStatusEnum>();

  private readonly elementRef = inject(ElementRef);
  private simulacao?: d3.Simulation<DemandaGrafoNoDto & d3.SimulationNodeDatum, undefined>;
  private svgSelecao?: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private comportamentoZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private gruposNo?: d3.Selection<SVGGElement, DemandaGrafoNoDto & d3.SimulationNodeDatum, SVGGElement, unknown>;
  private linhasAresta?: d3.Selection<SVGLineElement, any, SVGGElement, unknown>;
  private nosSimulados: Array<DemandaGrafoNoDto & d3.SimulationNodeDatum> = [];
  private ajusteInicialFeito = false;

  readonly cartao = signal<CartaoNo | null>(null);

  readonly itensLegenda = OPCOES_STATUS_DEMANDA;
  readonly rotuloStatus = ROTULO_STATUS_DEMANDA;

  /** "Projeto inteiro": desliga o foco só aqui, sem mexer na pasta das outras visões. */
  readonly projetoInteiro = signal(false);
  /** Os ids dentro do foco; `null` sem foco. */
  readonly focoIds = signal<Set<number> | null>(null);
  readonly subpastas = signal<DemandaGrafoNoDto[]>([]);
  readonly pastaAcima = signal<number | undefined>(undefined);
  readonly nomeDoFoco = signal<string>('');
  private readonly focoVazioNaTela = signal(false);
  /** Há foco e nenhuma demanda dele passa nos filtros da toolbar. */
  readonly nadaNoFoco = computed(() => this.focoIds() !== null && this.focoVazioNaTela());

  statusEstaVisivel(status: TipoDemandaStatusEnum): boolean {
    return this.statusVisiveis.includes(status);
  }

  /** Os botões do foco: volta ao projeto inteiro, sobe uma pasta ou desce para uma subpasta. */
  verProjetoInteiro(): void {
    this.projetoInteiro.set(true);
    this.atualizarFoco();
  }

  subirPasta(): void {
    const acima = this.pastaAcima();
    if (acima !== undefined) this.escolherPasta(acima);
  }

  escolherPasta(pastaId: PastaId): void {
    this.projetoInteiro.set(false);
    this.pastaChange.emit(pastaId);
  }

  alternarLegenda(evento: Event, popover: Popover): void {
    popover.toggle(evento);
  }

  aproximar(): void {
    this.svgSelecao?.transition().duration(200).call(this.comportamentoZoom!.scaleBy, 1.4);
  }

  afastar(): void {
    this.svgSelecao?.transition().duration(200).call(this.comportamentoZoom!.scaleBy, 1 / 1.4);
  }

  centralizar(): void {
    this.svgSelecao?.transition().duration(250).call(this.comportamentoZoom!.transform, d3.zoomIdentity);
  }

  ngOnInit(): void {
    this.inicializarGrafo();
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (!mudancas['grafo']?.firstChange && mudancas['grafo']?.currentValue) {
      this.destruirGrafo();
      this.inicializarGrafo();
    } else if (!mudancas['pastaId']?.firstChange && (mudancas['pastaId'] || mudancas['todosOsNos'])) {
      if (mudancas['pastaId']) this.projetoInteiro.set(false);
      this.atualizarFoco(Boolean(mudancas['pastaId']));
    }
  }

  /** Recalcula o foco e apaga o que ficou de fora, sem refazer o layout; `ajustar` leva a visão até as demandas do foco. */
  private atualizarFoco(ajustar = true): void {
    const todos = this.todosOsNos.length ? this.todosOsNos : (this.grafo?.nos ?? []);
    const comFoco = this.pastaId !== undefined && !this.projetoInteiro();
    this.focoIds.set(comFoco ? idsDoFoco(todos, this.pastaId as PastaId) : null);
    this.subpastas.set(this.pastaId === undefined ? [] : subpastasDoFoco(todos, this.pastaId));
    this.pastaAcima.set(this.pastaId === undefined ? undefined : pastaAcimaDoFoco(todos, this.pastaId));
    this.nomeDoFoco.set(this.pastaId === undefined ? '' : this.pastaId === null ? 'Sem pasta' : (todos.find((no) => no.id === this.pastaId)?.nome ?? ''));
    this.aplicarFoco();
    if (ajustar) this.ajustarAoFoco();
  }

  private estaNoFoco(no: DemandaGrafoNoDto): boolean {
    const foco = this.focoIds();
    return foco === null || foco.has(no.id);
  }

  private aplicarFoco(): void {
    this.gruposNo
      ?.style('opacity', (no) => (this.estaNoFoco(no) ? (no.status === TipoDemandaStatusEnum.CANCELADA ? 0.4 : 1) : 0.1))
      .style('pointer-events', (no) => (this.estaNoFoco(no) ? null : 'none'));
    this.linhasAresta?.style('opacity', (aresta: any) => (this.estaNoFoco(aresta.source) && this.estaNoFoco(aresta.target) ? 1 : 0.06));
    this.focoVazioNaTela.set(this.focoIds() !== null && this.nosSimulados.length > 0 && !this.nosSimulados.some((no) => this.estaNoFoco(no)));
  }

  /** Enquadra as demandas do foco (ou o projeto inteiro) na tela, sem aproximar além do tamanho normal. */
  private ajustarAoFoco(): void {
    const foco = this.focoIds();
    if (!this.svgSelecao || !this.comportamentoZoom || (foco === null && this.pastaId === undefined)) return;
    // Sem foco (o "Projeto inteiro" dos botões) enquadra o projeto todo.
    const dentro = this.nosSimulados.filter((no) => (foco === null || foco.has(no.id)) && no.x !== undefined && no.y !== undefined);
    if (!dentro.length) return;
    const largura = this.elementRef.nativeElement.clientWidth;
    const altura = this.elementRef.nativeElement.clientHeight;
    if (!largura || !altura) return; // oculto ou sem layout: não há o que enquadrar
    const margem = 90;
    const minX = Math.min(...dentro.map((no) => no.x!)) - margem;
    const maxX = Math.max(...dentro.map((no) => no.x!)) + margem;
    const minY = Math.min(...dentro.map((no) => no.y!)) - margem;
    const maxY = Math.max(...dentro.map((no) => no.y!)) + margem;
    const escala = Math.min(1.2, Math.max(0.1, Math.min(largura / (maxX - minX), altura / (maxY - minY))));
    const transformacao = d3.zoomIdentity
      .translate(largura / 2, altura / 2)
      .scale(escala)
      .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
    this.svgSelecao.transition().duration(350).call(this.comportamentoZoom.transform, transformacao);
  }

  /** A marca do status dentro do nó: ponto (planejada), ✓ (concluída) e risco (cancelada); a pendente fica vazia. */
  private desenharMarca(grupo: d3.Selection<SVGGElement, DemandaGrafoNoDto & d3.SimulationNodeDatum, SVGGElement, unknown>): void {
    const escala = (no: DemandaGrafoNoDto) => this.calcularRaioNo(no) / 10;

    grupo.filter((no) => no.status === TipoDemandaStatusEnum.PLANEJADA).append('circle')
      .attr('class', 'demanda-grafo__marca')
      .attr('r', (no) => 3.6 * escala(no))
      .style('fill', (no) => COR_NO_BORDA[no.status])
      .style('pointer-events', 'none');

    grupo.filter((no) => no.status === TipoDemandaStatusEnum.CONCLUIDA).append('path')
      .attr('class', 'demanda-grafo__marca')
      .attr('d', (no) => { const k = escala(no); return `M${-4.5 * k},${0.5 * k}l${3 * k},${3 * k}l${6 * k},${-6.5 * k}`; })
      .style('fill', 'none')
      .style('stroke', (no) => COR_NO_BORDA[no.status])
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .style('pointer-events', 'none');

    grupo.filter((no) => no.status === TipoDemandaStatusEnum.CANCELADA).append('path')
      .attr('class', 'demanda-grafo__marca')
      .attr('d', (no) => { const k = escala(no); return `M${-6 * k},${6 * k}L${6 * k},${-6 * k}`; })
      .style('fill', 'none')
      .style('stroke', (no) => COR_NO_BORDA[no.status])
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'round')
      .style('pointer-events', 'none');
  }

  ngOnDestroy(): void {
    this.destruirGrafo();
  }

  private destruirGrafo(): void {
    this.cartao.set(null);
    this.gruposNo = undefined;
    this.linhasAresta = undefined;
    this.nosSimulados = [];
    this.ajusteInicialFeito = false;
    if (this.simulacao) {
      this.simulacao.stop();
      this.simulacao = undefined;
    }
    d3.select(this.elementRef.nativeElement.querySelector('svg')).selectAll('*').remove();
  }

  private inicializarGrafo(): void {
    if (!this.grafo?.nos?.length) return;

    const largura = this.elementRef.nativeElement.clientWidth || 800;
    const altura = this.elementRef.nativeElement.clientHeight || 600;

    const svg = d3.select<SVGSVGElement, unknown>(this.elementRef.nativeElement.querySelector('svg'))
      .attr('width', largura)
      .attr('height', altura);

    this.svgSelecao = svg;
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'seta-hierarquia')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4Z')
      .style('fill', 'var(--p-primary-500)')
      .attr('fill-opacity', '0.7');

    const grupoZoom = svg.append('g');
    this.comportamentoZoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (evento) => {
        grupoZoom.attr('transform', evento.transform.toString());
        this.cartao.set(null);
      });
    svg.call(this.comportamentoZoom);

    const nosFiltrados = this.grafo.nos;
    const idsNosFiltrados = new Set(nosFiltrados.map((no) => no.id));

    const arestasFiltraras = this.grafo.arestas.filter(
      (aresta) => idsNosFiltrados.has(aresta.origemId) && idsNosFiltrados.has(aresta.destinoId),
    );

    const nos = nosFiltrados.map((no) => ({ ...no } as DemandaGrafoNoDto & d3.SimulationNodeDatum));
    this.nosSimulados = nos;
    const arestas = arestasFiltraras.map((aresta) => ({
      ...aresta,
      source: aresta.origemId as any,
      target: aresta.destinoId as any,
    } as DemandaGrafoArestaDto & d3.SimulationLinkDatum<DemandaGrafoNoDto & d3.SimulationNodeDatum>));

    this.simulacao = d3.forceSimulation<DemandaGrafoNoDto & d3.SimulationNodeDatum>(nos)
      .force(
        'aresta',
        d3.forceLink<DemandaGrafoNoDto & d3.SimulationNodeDatum, DemandaGrafoArestaDto & d3.SimulationLinkDatum<DemandaGrafoNoDto & d3.SimulationNodeDatum>>(arestas as any)
          .id((no: any) => no.id)
          .distance(160),
      )
      .force('repulsao', d3.forceManyBody().strength(-700))
      .force('centro', d3.forceCenter(largura / 2, altura / 2))
      .force('colisao', d3.forceCollide(60));

    const linhasAresta = this.linhasAresta = grupoZoom.append('g')
      .selectAll('line')
      .data(arestas)
      .enter()
      .append('line')
      .style('stroke', (aresta: any) => aresta.tipo === 'hierarquia' ? 'var(--p-primary-500)' : 'var(--app-surface-400)')
      .attr('stroke-width', (aresta: any) => aresta.tipo === 'hierarquia' ? 2 : 1.5)
      .attr('stroke-opacity', (aresta: any) => aresta.tipo === 'hierarquia' ? 0.6 : 0.5)
      .attr('stroke-dasharray', (aresta: any) => aresta.tipo === 'conexao' ? '5,3' : null)
      .attr('fill', 'none')
      .attr('marker-end', (aresta: any) =>
        aresta.tipo === 'hierarquia' ? 'url(#seta-hierarquia)' : null,
      );

    const gruposNo = this.gruposNo = grupoZoom.append('g')
      .selectAll('g')
      .data(nos)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .style('opacity', (no: DemandaGrafoNoDto) =>
        no.status === TipoDemandaStatusEnum.CANCELADA ? 0.4 : 1,
      )
      .call(
        d3.drag<SVGGElement, DemandaGrafoNoDto & d3.SimulationNodeDatum>()
          .on('start', (evento, no) => {
            if (!evento.active) this.simulacao?.alphaTarget(0.3).restart();
            no.fx = no.x;
            no.fy = no.y;
          })
          .on('drag', (evento, no) => { no.fx = evento.x; no.fy = evento.y; })
          .on('end', (evento, no) => {
            if (!evento.active) this.simulacao?.alphaTarget(0);
            no.fx = null;
            no.fy = null;
          }),
      )
      .on('click', (_evento: any, no: DemandaGrafoNoDto) => (no.isEstrutural ? this.escolherPasta(no.id) : this.demandaSelecionada.emit(no.id)))
      .on('mouseover', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
      .on('mousemove', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
      .on('mouseout', () => this.cartao.set(null));

    gruposNo.append('circle')
      .attr('class', 'demanda-grafo__no')
      .attr('r', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no))
      .style('fill', (no: DemandaGrafoNoDto) => corPreenchimentoNo(no.status))
      .style('stroke', (no: DemandaGrafoNoDto) => COR_NO_BORDA[no.status])
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', (no: DemandaGrafoNoDto) => no.isEstrutural ? '6,3' : null);

    this.desenharMarca(gruposNo);

    gruposNo.append('text')
      .attr('dy', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no) + 15)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--app-surface-700)')
      .attr('font-size', '11px')
      .style('stroke', 'var(--app-surface-50)')
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke fill')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .text((no: DemandaGrafoNoDto) =>
        no.nome.length > 24 ? `${no.nome.substring(0, 24)}…` : no.nome,
      );

    this.simulacao.on('tick', () => {
      linhasAresta
        .attr('x1', (aresta: any) => aresta.source.x)
        .attr('y1', (aresta: any) => aresta.source.y)
        .attr('x2', (aresta: any) => {
          const dx = aresta.target.x - aresta.source.x;
          const dy = aresta.target.y - aresta.source.y;
          const dist = Math.hypot(dx, dy) || 1;
          const offset = this.calcularRaioNo(aresta.target) + (aresta.tipo === 'hierarquia' ? 11 : 5);
          return aresta.target.x - (dx / dist) * offset;
        })
        .attr('y2', (aresta: any) => {
          const dx = aresta.target.x - aresta.source.x;
          const dy = aresta.target.y - aresta.source.y;
          const dist = Math.hypot(dx, dy) || 1;
          const offset = this.calcularRaioNo(aresta.target) + (aresta.tipo === 'hierarquia' ? 11 : 5);
          return aresta.target.y - (dy / dist) * offset;
        });

      gruposNo.attr('transform', (no: any) => `translate(${no.x},${no.y})`);
      // Com o layout já quase assentado, enquadra o foco uma vez; depois a pessoa mexe no zoom à vontade.
      if (!this.ajusteInicialFeito && (this.simulacao?.alpha() ?? 1) < 0.35) {
        this.ajusteInicialFeito = true;
        this.ajustarAoFoco();
      }
    });

    this.atualizarFoco(false);
  }

  /** Posiciona o cartão ao lado do cursor, virando para o outro lado perto das bordas do canvas. */
  private mostrarCartao(evento: MouseEvent, no: DemandaGrafoNoDto): void {
    const caixa = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
    const larguraCartao = 280;
    const alturaCartao = 150;
    let esquerda = evento.clientX - caixa.left + 16;
    let topo = evento.clientY - caixa.top + 16;
    if (esquerda + larguraCartao > caixa.width) esquerda = evento.clientX - caixa.left - larguraCartao - 16;
    if (topo + alturaCartao > caixa.height) topo = evento.clientY - caixa.top - alturaCartao - 16;
    this.cartao.set({ no, esquerda: Math.max(8, esquerda), topo: Math.max(8, topo) });
  }

  private calcularRaioNo(no: DemandaGrafoNoDto): number {
    const raioEstrutural = 28;
    return no.isEstrutural ? raioEstrutural : raioEstrutural * 0.6; // 16.8 (40% menor)
  }
}
