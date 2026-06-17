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
  SimpleChanges,
} from '@angular/core';
import * as d3 from 'd3';
import {
  DemandaGrafoDto,
  DemandaGrafoNoDto,
  DemandaGrafoArestaDto,
  DemandaStatusEnum,
  DemandaPrioridadeEnum,
} from '@project20/shared';
import { COR_NO_PREENCHIMENTO, COR_NO_BORDA } from '../../constants/demanda-cores.constants';

@Component({
  selector: 'app-demanda-grafo',
  standalone: true,
  template: `<svg #svgContainer class="demanda-grafo__svg"></svg>`,
  styleUrls: ['./demanda-grafo.component.scss'],
})
export class DemandaGrafoComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) grafo!: DemandaGrafoDto;
  @Input() filtroStatus?: DemandaStatusEnum[];
  @Output() demandaSelecionada = new EventEmitter<number>();

  private readonly elementRef = inject(ElementRef);
  private simulacao?: d3.Simulation<DemandaGrafoNoDto & d3.SimulationNodeDatum, undefined>;

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
      .attr('fill', '#4a9eff')
      .attr('fill-opacity', '0.7');

    const grupoZoom = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (evento) => grupoZoom.attr('transform', evento.transform.toString())),
    );

    const nosFiltrados = this.filtroStatus?.length
      ? this.grafo.nos.filter((no) => this.filtroStatus!.includes(no.status))
      : this.grafo.nos;

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
      .attr('stroke', (aresta: any) => aresta.tipo === 'hierarquia' ? '#4a9eff' : '#4a5568')
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
      .on('mouseover', function() {
        d3.select(this).select('circle')
          .attr('stroke-width', 5)
          .style('filter', 'brightness(1.6)');
        d3.select(this).select('text')
          .attr('fill', '#e6edf3');
      })
      .on('mouseout', function() {
        d3.select(this).select('circle')
          .attr('stroke-width', 3)
          .style('filter', null);
        d3.select(this).select('text')
          .attr('fill', '#b0bec5');
      });

    gruposNo.append('circle')
      .attr('r', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no))
      .attr('fill', (no: DemandaGrafoNoDto) => COR_NO_PREENCHIMENTO[no.status])
      .attr('stroke', (no: DemandaGrafoNoDto) => COR_NO_BORDA[no.status])
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', (no: DemandaGrafoNoDto) => no.isEstrutural ? '6,3' : null);

    gruposNo.append('text')
      .attr('dy', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no) + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#b0bec5')
      .attr('font-size', '11px')
      .attr('stroke', '#0d1117')
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke fill')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .text((no: DemandaGrafoNoDto) =>
        no.nome.length > 24 ? `${no.nome.substring(0, 24)}…` : no.nome,
      );

    gruposNo.append('title').text((no: DemandaGrafoNoDto) => {
      const linhas = [`${no.nome}\n${no.status} • ${no.horasEstimadas}h estimadas`];
      if (no.tags?.length) linhas.push(no.tags.map((t) => t.nome).join(', '));
      return linhas.join('\n');
    });

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

  private calcularRaioNo(no: DemandaGrafoNoDto): number {
    if (no.isEstrutural) return 28;
    const raioPorPrioridade: Record<DemandaPrioridadeEnum, number> = {
      [DemandaPrioridadeEnum.BAIXA]:   12,
      [DemandaPrioridadeEnum.MEDIA]:   15,
      [DemandaPrioridadeEnum.ALTA]:    19,
      [DemandaPrioridadeEnum.CRITICA]: 22,
    };
    return raioPorPrioridade[no.prioridade] ?? 12;
  }
}
