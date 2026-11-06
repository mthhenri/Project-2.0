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
import { COR_NO_BORDA, OPCOES_STATUS_DEMANDA, ROTULO_STATUS_DEMANDA, corPreenchimentoNo } from '../../constants/demanda-cores.constants';
import { DemandaBarraControleHorasComponent } from '../demanda-barra-controle-horas/demanda-barra-controle-horas.component';
import { DemandaStatusComponent } from '../demanda-status/demanda-status.component';
import { DemandaStatusMarcaComponent } from '../demanda-status-marca/demanda-status-marca.component';
import { textoDaConexao } from '../../utils/demanda-recorte-conexoes.util';

/** Nó sob o mouse: posição do cartão flutuante em coordenadas do componente. */
interface CartaoNo {
    no: DemandaGrafoNoDto;
    esquerda: number;
    topo: number;
    /** O cartão fica à esquerda/acima do ponto (e não à direita/abaixo) quando não cabe: a largura real não importa. */
    paraEsquerda: boolean;
    paraCima: boolean;
}

type NoSimulado = DemandaGrafoNoDto & d3.SimulationNodeDatum;
type ArestaSimulada = DemandaGrafoArestaDto & d3.SimulationLinkDatum<NoSimulado>;

const TODOS_OS_STATUS = Object.values(TipoDemandaStatusEnum);

const OPACIDADE_CANCELADA = 0.4;
/** Nó (e aresta que toca nele) que não atende ao filtro da toolbar: continua no grafo, só esmaecido. */
const OPACIDADE_FORA_DO_FILTRO = 0.25;

/**
 * Grafo de demandas (d3) integrado ao tema (task 107): cores por tokens, cartão no hover, legenda em popover
 * cujos status filtram o grafo e controles de zoom. O filtro da toolbar não tira nós do grafo: `idsEmDestaque` esmaece os demais.
 *
 * Task 305: no modo `recorte` o mesmo desenho serve à aba Conexões da demanda aberta: a demanda em `focoId` fica fixa no centro, as conexões ganham
 * seta (nas duas pontas quando mútua) e o texto do tipo ao longo da linha, não há zoom nem legenda e os nós ligados podem ter o × de remover.
 *
 * Task 241: o nó leva a marca do status, o cartão usa a barra do Controle de horas e o clique abre a demanda (ou a pasta) na Árvore. O grafo sempre
 * mostra o projeto todo: não há foco por pasta.
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
    /** `projeto`: o grafo do projeto todo, com zoom e legenda. `recorte`: a demanda e suas conexões, sem zoom nem legenda (task 305). */
    @Input() modo: 'projeto' | 'recorte' = 'projeto';
    /** No modo recorte, a demanda aberta: fica no centro, com um anel, e dá o sentido do texto de cada linha. */
    @Input() focoId: number | null = null;
    /** No modo recorte, os nós ligados mostram o × de remover a conexão (quem pode editar a demanda). */
    @Input() removivel = false;
    @Output() noRemovido = new EventEmitter<number>();
    /** Status exibidos (a legenda mostra os demais como desligados). */
    @Input() statusVisiveis: TipoDemandaStatusEnum[] = TODOS_OS_STATUS;
    /** Demandas que atendem ao filtro da toolbar; `null` quando não há filtro (nenhuma esmaece). Mudar isto só troca a opacidade: o layout não recomeça. */
    @Input() idsEmDestaque: ReadonlySet<number> | null = null;
    @Output() demandaSelecionada = new EventEmitter<number>();
    /** Um status da legenda foi clicado (liga/desliga): quem hospeda aplica no filtro da toolbar. */
    @Output() statusAlternado = new EventEmitter<TipoDemandaStatusEnum>();

    private readonly elementRef = inject(ElementRef);
    private simulacao?: d3.Simulation<DemandaGrafoNoDto & d3.SimulationNodeDatum, undefined>;
    private svgSelecao?: d3.Selection<SVGSVGElement, unknown, HTMLElement, undefined>;
    private comportamentoZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private gruposNo?: d3.Selection<SVGGElement, DemandaGrafoNoDto & d3.SimulationNodeDatum, SVGGElement, unknown>;
    private linhasAresta?: d3.Selection<SVGLineElement, ArestaSimulada, SVGGElement, unknown>;
    private nosSimulados: Array<DemandaGrafoNoDto & d3.SimulationNodeDatum> = [];
    /** Primeiro enquadramento, com o layout ainda se assentando (dá uma vista rápida); o final vem quando a simulação termina (P-060). */
    private ajusteInicialFeito = false;
    private ajusteFinalFeito = false;
    /** A pessoa já mexeu no zoom ou no arrasto: o enquadramento final não sobrescreve a vista dela. */
    private zoomManual = false;

    readonly cartao = signal<CartaoNo | null>(null);

    readonly itensLegenda = OPCOES_STATUS_DEMANDA;
    readonly rotuloStatus = ROTULO_STATUS_DEMANDA;

    statusEstaVisivel(status: TipoDemandaStatusEnum): boolean {
        return this.statusVisiveis.includes(status);
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
        const recomecar = ['grafo', 'focoId', 'removivel'].some((chave) => mudancas[chave] && !mudancas[chave].firstChange && (chave !== 'grafo' || mudancas[chave].currentValue));
        if (recomecar) {
            this.destruirGrafo();
            this.inicializarGrafo();
        } else if (mudancas['idsEmDestaque'] && !mudancas['idsEmDestaque'].firstChange) {
            this.aplicarDestaque();
        }
    }

    private noEstaForaDoFiltro(id: number): boolean {
        return this.idsEmDestaque !== null && !this.idsEmDestaque.has(id);
    }

    private aplicarDestaque(): void {
        this.gruposNo?.style('opacity', (no) => {
            if (this.noEstaForaDoFiltro(no.id)) return OPACIDADE_FORA_DO_FILTRO;
            return no.status === TipoDemandaStatusEnum.CANCELADA ? OPACIDADE_CANCELADA : 1;
        });
        this.linhasAresta?.style('opacity', (aresta: DemandaGrafoArestaDto) =>
            this.noEstaForaDoFiltro(aresta.origemId) || this.noEstaForaDoFiltro(aresta.destinoId) ? OPACIDADE_FORA_DO_FILTRO : 1,
        );
    }

    /** Enquadra o projeto todo na tela, sem aproximar além do tamanho normal. */
    private ajustarAoGrafo(): void {
        if (!this.svgSelecao || !this.comportamentoZoom) return;
        const dentro = this.nosSimulados.filter((no) => no.x !== undefined && no.y !== undefined);
        if (!dentro.length) return;
        const largura = this.elementRef.nativeElement.clientWidth;
        const altura = this.elementRef.nativeElement.clientHeight;
        if (!largura || !altura) return; // oculto ou sem layout: não há o que enquadrar
        const margem = this.modo === 'recorte' ? 60 : 90;
        const minX = Math.min(...dentro.map((no) => no.x!)) - margem;
        const maxX = Math.max(...dentro.map((no) => no.x!)) + margem;
        const minY = Math.min(...dentro.map((no) => no.y!)) - margem;
        const maxY = Math.max(...dentro.map((no) => no.y!)) + margem;
        const escala = Math.min(this.modo === 'recorte' ? 1.4 : 1.2, Math.max(0.1, Math.min(largura / (maxX - minX), altura / (maxY - minY))));
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
        this.ajusteFinalFeito = false;
        this.zoomManual = false;
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

        if (this.modo === 'recorte') {
            for (const [id, cor] of [['seta-conexao', 'var(--app-surface-500)'], ['seta-conexao-cancelada', 'var(--p-orange-500)']]) {
                defs.append('marker')
                    .attr('id', id)
                    .attr('viewBox', '0 -4 8 8')
                    .attr('refX', 0)
                    .attr('refY', 0)
                    .attr('markerWidth', 6)
                    .attr('markerHeight', 6)
                    .attr('orient', 'auto-start-reverse')
                    .append('path')
                    .attr('d', 'M0,-4L8,0L0,4Z')
                    .style('fill', cor);
            }
        }

        const grupoZoom = svg.append('g');
        this.comportamentoZoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (evento) => {
                grupoZoom.attr('transform', evento.transform.toString());
                if (evento.sourceEvent) this.zoomManual = true;
                this.cartao.set(null);
            });
        svg.call(this.comportamentoZoom);
        if (this.modo === 'recorte') svg.on('.zoom', null); // sem zoom nem arrasto da vista: o recorte só se enquadra

        const nosFiltrados = this.grafo.nos;
        const idsNosFiltrados = new Set(nosFiltrados.map((no) => no.id));

        const arestasFiltraras = this.grafo.arestas.filter(
            (aresta) => idsNosFiltrados.has(aresta.origemId) && idsNosFiltrados.has(aresta.destinoId),
        );

        const nos = nosFiltrados.map((no) => {
            const simulado = { ...no } as DemandaGrafoNoDto & d3.SimulationNodeDatum;
            if (this.modo === 'recorte' && no.id === this.focoId) {
                simulado.fx = largura / 2;
                simulado.fy = altura / 2;
            }
            return simulado;
        });
        this.nosSimulados = nos;
        const arestas = arestasFiltraras.map((aresta) => ({
            ...aresta,
            source: aresta.origemId,
            target: aresta.destinoId,
        } as DemandaGrafoArestaDto & d3.SimulationLinkDatum<DemandaGrafoNoDto & d3.SimulationNodeDatum>));

        this.simulacao = d3.forceSimulation<DemandaGrafoNoDto & d3.SimulationNodeDatum>(nos)
            .force(
                'aresta',
                d3.forceLink<NoSimulado, ArestaSimulada>(arestas)
                    .id((no) => no.id)
                    .distance(this.modo === 'recorte' ? 200 : 160),
            )
            .force('repulsao', d3.forceManyBody().strength(this.modo === 'recorte' ? -250 : -700))
            .force('centro', d3.forceCenter(largura / 2, altura / 2))
            .force('colisao', d3.forceCollide(60));

        const linhasAresta = this.linhasAresta = grupoZoom.append('g')
            .selectAll('line')
            .data(arestas)
            .enter()
            .append('line')
            .attr('class', 'demanda-grafo__aresta')
            .style('stroke', (aresta: ArestaSimulada) => aresta.tipo === 'hierarquia' ? 'var(--p-primary-500)' : this.arestaLigadaACancelada(aresta) ? 'var(--p-orange-500)' : 'var(--app-surface-400)')
            .attr('stroke-width', (aresta: ArestaSimulada) => aresta.tipo === 'hierarquia' ? 2 : 1.5)
            .attr('stroke-opacity', (aresta: ArestaSimulada) => aresta.tipo === 'hierarquia' ? 0.6 : 0.5)
            .attr('stroke-dasharray', (aresta: ArestaSimulada) => aresta.tipo === 'conexao' ? '5,3' : null)
            .attr('fill', 'none')
            .attr('marker-end', (aresta: ArestaSimulada) =>
                aresta.tipo === 'hierarquia' ? 'url(#seta-hierarquia)' : this.modo === 'recorte' ? `url(#${this.marcadorDaConexao(aresta)})` : null,
            )
            .attr('marker-start', (aresta: ArestaSimulada) =>
                this.modo === 'recorte' && aresta.bidirecional ? `url(#${this.marcadorDaConexao(aresta)})` : null,
            );

        const rotulosAresta = this.modo === 'recorte'
            ? grupoZoom.append('g')
                .selectAll('text')
                .data(arestas)
                .enter()
                .append('text')
                .attr('class', 'demanda-grafo__rotulo-aresta')
                .attr('text-anchor', 'middle')
                .attr('dy', -6)
                .attr('font-size', '11px')
                .attr('font-weight', 600)
                .style('fill', (aresta: ArestaSimulada) => this.arestaLigadaACancelada(aresta) ? 'var(--p-orange-600)' : 'var(--app-surface-600)')
                .style('stroke', 'var(--app-surface-50)')
                .attr('stroke-width', 4)
                .attr('stroke-linejoin', 'round')
                .attr('paint-order', 'stroke fill')
                .style('pointer-events', 'none')
                .style('user-select', 'none')
                .text((aresta: ArestaSimulada) => textoDaConexao(aresta, this.focoId ?? -1))
            : null;

        const gruposNo = this.gruposNo = grupoZoom.append('g')
            .selectAll('g')
            .data(nos)
            .enter()
            .append('g')
            .attr('class', 'demanda-grafo__no-grupo')
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
            .on('click', (_evento: MouseEvent, no: DemandaGrafoNoDto) => this.demandaSelecionada.emit(no.id))
            .on('mouseover', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
            .on('mousemove', (evento: MouseEvent, no: DemandaGrafoNoDto) => this.mostrarCartao(evento, no))
            .on('mouseout', () => this.cartao.set(null));

        gruposNo.append('circle')
            .attr('class', 'demanda-grafo__no')
            .attr('r', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no))
            .style('fill', (no: DemandaGrafoNoDto) => corPreenchimentoNo(no.status))
            .style('stroke', (no: DemandaGrafoNoDto) => COR_NO_BORDA[no.status])
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', (no: DemandaGrafoNoDto) => no.estrutural ? '6,3' : null);

        this.desenharMarca(gruposNo);
        if (this.modo === 'recorte') this.desenharAnelEBotaoRemover(gruposNo);

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

        this.aplicarDestaque();

        this.simulacao.on('tick', () => {
            // Depois que a simulação roda, `source` e `target` deixam de ser ids e passam a ser os próprios nós.
            const origem = (aresta: ArestaSimulada) => aresta.source as NoSimulado;
            const destino = (aresta: ArestaSimulada) => aresta.target as NoSimulado;
            const comSeta = (aresta: ArestaSimulada) => aresta.tipo === 'hierarquia' || this.modo === 'recorte';
            const deslocamentoDaPonta = (aresta: ArestaSimulada) => this.calcularRaioNo(destino(aresta)) + (comSeta(aresta) ? 11 : 5);
            const deslocamentoDaOrigem = (aresta: ArestaSimulada) => (this.modo === 'recorte' && aresta.bidirecional ? this.calcularRaioNo(origem(aresta)) + 11 : 0);
            const vetor = (aresta: ArestaSimulada) => {
                const dx = (destino(aresta).x ?? 0) - (origem(aresta).x ?? 0);
                const dy = (destino(aresta).y ?? 0) - (origem(aresta).y ?? 0);
                return { dx, dy, distancia: Math.hypot(dx, dy) || 1 };
            };

            linhasAresta
                .attr('x1', (aresta) => (origem(aresta).x ?? 0) + (vetor(aresta).dx / vetor(aresta).distancia) * deslocamentoDaOrigem(aresta))
                .attr('y1', (aresta) => (origem(aresta).y ?? 0) + (vetor(aresta).dy / vetor(aresta).distancia) * deslocamentoDaOrigem(aresta))
                .attr('x2', (aresta) => (destino(aresta).x ?? 0) - (vetor(aresta).dx / vetor(aresta).distancia) * deslocamentoDaPonta(aresta))
                .attr('y2', (aresta) => (destino(aresta).y ?? 0) - (vetor(aresta).dy / vetor(aresta).distancia) * deslocamentoDaPonta(aresta));

            // O texto fica no meio da linha, na direção dela, sempre de pé (nunca de cabeça para baixo).
            rotulosAresta?.attr('transform', (aresta: ArestaSimulada) => {
                const meioX = ((origem(aresta).x ?? 0) + (destino(aresta).x ?? 0)) / 2;
                const meioY = ((origem(aresta).y ?? 0) + (destino(aresta).y ?? 0)) / 2;
                let graus = (Math.atan2(vetor(aresta).dy, vetor(aresta).dx) * 180) / Math.PI;
                if (graus > 90 || graus < -90) graus += 180;
                return `translate(${meioX},${meioY}) rotate(${graus})`;
            });

            gruposNo.attr('transform', (no) => `translate(${no.x},${no.y})`);
            // Com o layout já quase assentado, enquadra o projeto uma vez; depois a pessoa mexe no zoom à vontade.
            if (!this.ajusteInicialFeito && (this.simulacao?.alpha() ?? 1) < 0.35) {
                this.ajusteInicialFeito = true;
                this.ajustarAoGrafo();
            }
        });

        // A repulsão continua afastando os blocos desconectados depois do primeiro enquadramento: ao assentar, enquadra de novo (P-060).
        this.simulacao.on('end', () => {
            if (this.ajusteFinalFeito) return;
            this.ajusteFinalFeito = true;
            if (!this.zoomManual) this.ajustarAoGrafo();
        });

    }

    /** No recorte, a conexão que toca uma demanda cancelada é laranja (aviso). */
    private arestaLigadaACancelada(aresta: DemandaGrafoArestaDto): boolean {
        if (this.modo !== 'recorte' || aresta.tipo !== 'conexao') return false;
        const cancelada = (id: number) => id !== this.focoId && this.grafo.nos.find((no) => no.id === id)?.status === TipoDemandaStatusEnum.CANCELADA;
        return cancelada(aresta.origemId) || cancelada(aresta.destinoId);
    }

    private marcadorDaConexao(aresta: DemandaGrafoArestaDto): string {
        return this.arestaLigadaACancelada(aresta) ? 'seta-conexao-cancelada' : 'seta-conexao';
    }

    /** No recorte: o anel em volta da demanda aberta e o × (remover a conexão) nos nós ligados. */
    private desenharAnelEBotaoRemover(grupo: d3.Selection<SVGGElement, DemandaGrafoNoDto & d3.SimulationNodeDatum, SVGGElement, unknown>): void {
        grupo.filter((no) => no.id === this.focoId).insert('circle', ':first-child')
            .attr('class', 'demanda-grafo__anel-foco')
            .attr('r', (no) => this.calcularRaioNo(no) + 7)
            .style('fill', 'none')
            .style('stroke', 'var(--p-primary-500)')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.55)
            .style('pointer-events', 'none');

        if (!this.removivel) return;
        const botao = grupo.filter((no) => no.id !== this.focoId).append('g')
            .attr('class', 'demanda-grafo__remover')
            .attr('role', 'button')
            .attr('aria-label', 'Remover conexão')
            .attr('transform', (no) => `translate(${this.calcularRaioNo(no) * 0.85},${-this.calcularRaioNo(no) * 0.85})`)
            .style('cursor', 'pointer')
            .on('click', (evento: MouseEvent, no: DemandaGrafoNoDto) => {
                evento.stopPropagation();
                this.noRemovido.emit(no.id);
            })
            .on('mouseover', () => this.cartao.set(null));
        botao.append('circle').attr('r', 8).style('fill', 'var(--app-surface-0)').style('stroke', 'var(--p-red-500)').attr('stroke-width', 1.5);
        botao.append('path')
            .attr('d', 'M-3,-3L3,3M3,-3L-3,3')
            .style('stroke', 'var(--p-red-500)')
            .attr('stroke-width', 1.8)
            .attr('stroke-linecap', 'round')
            .style('fill', 'none');
    }

    /** Posiciona o cartão ao lado do cursor, virando para o outro lado perto das bordas do canvas. */
    private mostrarCartao(evento: MouseEvent, no: DemandaGrafoNoDto): void {
        const caixa = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
        const larguraCartao = 280; // estimativa só para decidir o lado; o cartão cresce com o conteúdo
        const alturaCartao = 150;
        const paraEsquerda = evento.clientX - caixa.left + 16 + larguraCartao > caixa.width;
        const paraCima = evento.clientY - caixa.top + 16 + alturaCartao > caixa.height;
        const esquerda = evento.clientX - caixa.left + (paraEsquerda ? -16 : 16);
        const topo = evento.clientY - caixa.top + (paraCima ? -16 : 16);
        this.cartao.set({ no, esquerda: Math.max(8, esquerda), topo: Math.max(8, topo), paraEsquerda, paraCima });
    }

    private calcularRaioNo(no: DemandaGrafoNoDto): number {
        const raioEstrutural = 28;
        return no.estrutural ? raioEstrutural : raioEstrutural * 0.6; // 16.8 (40% menor)
    }
}
