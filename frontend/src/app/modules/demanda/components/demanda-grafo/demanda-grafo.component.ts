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
import { COR_NO_BORDA, corPreenchimentoNo } from '../../constants/demanda-cores.constants';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { DemandaStatusChipComponent } from '../demanda-status-chip/demanda-status-chip.component';

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
 */
@Component({
  selector: 'app-demanda-grafo',
  standalone: true,
  imports: [ButtonModule, PopoverModule, TooltipModule, TempoExibicaoPipe, DemandaStatusChipComponent],
  templateUrl: './demanda-grafo.component.html',
  styleUrls: ['./demanda-grafo.component.scss'],
})
export class DemandaGrafoComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) grafo!: DemandaGrafoDto;
  /** Status exibidos (a legenda mostra os demais como desligados). */
  @Input() statusVisiveis: TipoDemandaStatusEnum[] = TODOS_OS_STATUS;
  @Output() demandaSelecionada = new EventEmitter<number>();
  /** Um status da legenda foi clicado (liga/desliga): quem hospeda aplica no filtro da toolbar. */
  @Output() statusAlternado = new EventEmitter<TipoDemandaStatusEnum>();

  private readonly elementRef = inject(ElementRef);
  readonly unidadeTempo = inject(VisualizacaoTempoService);
  private simulacao?: d3.Simulation<DemandaGrafoNoDto & d3.SimulationNodeDatum, undefined>;
  private svgSelecao?: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private comportamentoZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;

  readonly cartao = signal<CartaoNo | null>(null);

  readonly itensLegenda = [
    { status: TipoDemandaStatusEnum.PENDENTE,  rotulo: 'Pendente',  cor: COR_NO_BORDA[TipoDemandaStatusEnum.PENDENTE] },
    { status: TipoDemandaStatusEnum.PLANEJADA, rotulo: 'Planejada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.PLANEJADA] },
    { status: TipoDemandaStatusEnum.CONCLUIDA, rotulo: 'Concluída', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CONCLUIDA] },
    { status: TipoDemandaStatusEnum.CANCELADA, rotulo: 'Cancelada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CANCELADA] },
  ];

  statusEstaVisivel(status: TipoDemandaStatusEnum): boolean {
    return this.statusVisiveis.includes(status);
  }

  /** Fração 0..100 do executado sobre o estimado; a barra do cartão trava em 100. */
  percentual(no: DemandaGrafoNoDto): number {
    const minutosEstimados = no.horasEstimadas * 60;
    return minutosEstimados > 0 ? Math.round((no.minutosExecutados / minutosEstimados) * 100) : 0;
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
    }
  }

  ngOnDestroy(): void {
    this.destruirGrafo();
  }

  private destruirGrafo(): void {
    this.cartao.set(null);
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

    const linhasAresta = grupoZoom.append('g')
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

    const gruposNo = grupoZoom.append('g')
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
      .on('click', (_evento: any, no: DemandaGrafoNoDto) => this.demandaSelecionada.emit(no.id))
      .on('mouseover', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
      .on('mousemove', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
      .on('mouseout', () => this.cartao.set(null));

    gruposNo.append('circle')
      .attr('r', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no))
      .style('fill', (no: DemandaGrafoNoDto) => corPreenchimentoNo(no.status))
      .style('stroke', (no: DemandaGrafoNoDto) => COR_NO_BORDA[no.status])
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', (no: DemandaGrafoNoDto) => no.isEstrutural ? '6,3' : null);

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
    });
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
