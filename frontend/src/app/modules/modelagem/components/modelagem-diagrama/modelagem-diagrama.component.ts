import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import * as d3 from 'd3';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import type { ModelagemDiagrama, ModelagemTabela } from '@project20/shared';
import {
  ALTURA_CABECALHO_TABELA,
  ALTURA_LINHA_TABELA,
  alturaDaTabela,
  caminhoDaAresta,
  colunaCasaBusca,
  enquadrar,
  montarArestas,
  posicoesParaConfiguracao,
  retanguloDasTabelas,
  tabelaCasaBusca,
  vizinhasDe,
} from '../../utils/modelagem.util';

const QUANTIDADE_DE_CORES = 8;
const FOLGA_DO_GRUPO = { lados: 18, topo: 36, base: 18 };
const FOLGA_DO_ENQUADRAMENTO = { lados: 40, topo: 60, base: 40 };
const LARGURA_PADRAO = 1200;
const ALTURA_PADRAO = 700;
const MOVIMENTO_MINIMO_PARA_ARRASTAR = 4;

interface ArrastoDeTabela {
  nome: string;
  clienteX: number;
  clienteY: number;
  origemX: number;
  origemY: number;
  moveu: boolean;
}

/**
 * Diagrama entidade-relacionamento em SVG: zoom e deslocamento por d3-zoom (como o grafo de demandas), tabelas
 * arrastáveis, foco por passagem do mouse ou seleção e realce da busca. Não consulta nada: desenha o
 * `ModelagemDiagrama` gerado por `npm run modelagem`.
 */
@Component({
  selector: 'app-modelagem-diagrama',
  standalone: true,
  imports: [ButtonModule, PopoverModule, TooltipModule],
  templateUrl: './modelagem-diagrama.component.html',
  styleUrl: './modelagem-diagrama.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelagemDiagramaComponent {
  readonly diagrama = input.required<ModelagemDiagrama>();
  /** Grupos exibidos; o resto some junto com as ligações que chegam a ele. */
  readonly gruposVisiveis = input.required<ReadonlySet<string>>();
  readonly busca = input<string>('');
  readonly selecionada = model<string | null>(null);

  private readonly elementoSvg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private selecaoSvg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private comportamentoZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private arrasto: ArrastoDeTabela | null = null;
  /** Enquanto a pessoa não mexe na vista (zoom, arrasto, centralizar), o diagrama continua enquadrado quando a janela muda de tamanho. */
  private enquadramentoAutomatico = true;

  readonly alturaCabecalho = ALTURA_CABECALHO_TABELA;
  readonly alturaLinha = ALTURA_LINHA_TABELA;

  readonly camera = signal({ x: 0, y: 0, escala: 1 });
  private readonly posicoes = signal<Record<string, { x: number; y: number }>>({});
  private readonly emHover = signal<string | null>(null);

  readonly tabelas = computed<ModelagemTabela[]>(() => {
    const movidas = this.posicoes();
    return this.diagrama().tabelas.map((tabela) => (movidas[tabela.nome] ? { ...tabela, ...movidas[tabela.nome] } : tabela));
  });
  private readonly tabelaPorNome = computed(() => new Map(this.tabelas().map((tabela) => [tabela.nome, tabela])));
  private readonly arestas = computed(() => montarArestas(this.tabelas()));
  private readonly coresPorGrupo = computed(() => new Map(this.diagrama().grupos.map((grupo, indice) => [grupo.id, indice % QUANTIDADE_DE_CORES])));

  private readonly foco = computed(() => this.emHover() ?? this.selecionada());
  private readonly vizinhasDoFoco = computed(() => (this.foco() ? vizinhasDe(this.foco() as string, this.arestas()) : null));
  private readonly temBusca = computed(() => this.busca().trim().length > 0);

  readonly tabelasVisiveis = computed(() =>
    this.tabelas()
      .filter((tabela) => this.gruposVisiveis().has(tabela.grupo))
      .map((tabela) => {
        const vizinhas = this.vizinhasDoFoco();
        const apagada = vizinhas ? !vizinhas.has(tabela.nome) : this.temBusca() && !tabelaCasaBusca(tabela, this.busca());
        return {
          tabela,
          cor: this.coresPorGrupo().get(tabela.grupo) ?? 0,
          altura: alturaDaTabela(tabela),
          apagada,
          selecionada: tabela.nome === this.selecionada(),
          achadaNaBusca: !vizinhas && this.temBusca() && !apagada,
          linhas: tabela.colunas.map((coluna) => ({ coluna, achada: colunaCasaBusca(coluna, this.busca()) })),
        };
      }),
  );

  readonly caixasDeGrupo = computed(() =>
    this.diagrama().grupos.flatMap((grupo) => {
      const retangulo = retanguloDasTabelas(
        this.tabelas().filter((tabela) => tabela.grupo === grupo.id && this.gruposVisiveis().has(grupo.id)),
        FOLGA_DO_GRUPO,
      );
      return retangulo ? [{ grupo, retangulo, cor: this.coresPorGrupo().get(grupo.id) ?? 0 }] : [];
    }),
  );

  readonly ligacoes = computed(() => {
    const visiveis = this.gruposVisiveis();
    const foco = this.foco();
    const temBusca = this.temBusca();
    return this.arestas().flatMap((aresta) => {
      const origem = this.tabelaPorNome().get(aresta.origem);
      const destino = this.tabelaPorNome().get(aresta.destino);
      if (!origem || !destino || !visiveis.has(origem.grupo) || !visiveis.has(destino.grupo)) return [];
      const emFoco = !!foco && (aresta.origem === foco || aresta.destino === foco);
      return [{
        chave: `${aresta.origem}.${aresta.coluna}`,
        ...caminhoDaAresta(origem, aresta.coluna, destino),
        logica: aresta.logica,
        emFoco,
        apagada: foco ? !emFoco : temBusca,
        forteApagada: !!foco && !emFoco,
      }];
    });
  });

  readonly transformacao = computed(() => `translate(${this.camera().x},${this.camera().y}) scale(${this.camera().escala})`);

  constructor() {
    afterNextRender(() => {
      this.iniciarZoom();
      this.enquadrarTudo(false);
      this.acompanharTamanhoDaJanela();
    });
    this.destroyRef.onDestroy(() => this.selecaoSvg?.on('.zoom', null));
  }

  aproximar(): void {
    this.enquadramentoAutomatico = false;
    this.selecaoSvg?.transition().duration(200).call(this.comportamentoZoom!.scaleBy, 1.4);
  }

  afastar(): void {
    this.enquadramentoAutomatico = false;
    this.selecaoSvg?.transition().duration(200).call(this.comportamentoZoom!.scaleBy, 1 / 1.4);
  }

  enquadrarTudo(animar = true): void {
    const retangulo = retanguloDasTabelas(
      this.tabelas().filter((tabela) => this.gruposVisiveis().has(tabela.grupo)),
      FOLGA_DO_ENQUADRAMENTO,
    );
    if (!retangulo || !this.selecaoSvg) return;
    const { largura, altura } = this.areaVisivel();
    const quadro = enquadrar(retangulo, largura, altura);
    this.enquadramentoAutomatico = true;
    this.aplicarTransformacao(d3.zoomIdentity.translate(quadro.x, quadro.y).scale(quadro.escala), animar);
  }

  /** Leva a tabela ao centro da área visível, sem afastar mais do que a escala atual. */
  centralizarEm(nome: string): void {
    const tabela = this.tabelaPorNome().get(nome);
    if (!tabela || !this.selecaoSvg) return;
    const { largura, altura } = this.areaVisivel();
    const escala = Math.max(this.camera().escala, 0.9);
    const x = largura / 2 - (tabela.x + tabela.largura / 2) * escala;
    const y = altura / 2 - (tabela.y + alturaDaTabela(tabela) / 2) * escala;
    this.enquadramentoAutomatico = false;
    this.aplicarTransformacao(d3.zoomIdentity.translate(x, y).scale(escala), true);
  }

  restaurarPosicoes(): void {
    this.posicoes.set({});
    this.enquadrarTudo();
  }

  alternarLegenda(evento: Event, legenda: Popover): void {
    legenda.toggle(evento);
  }

  async copiarPosicoes(): Promise<void> {
    const texto = posicoesParaConfiguracao(this.tabelas());
    try {
      await navigator.clipboard.writeText(texto);
      this.messageService.add({ severity: 'success', summary: 'Posições copiadas', detail: 'Cole no campo "posicoes" de modelagem.config.json e rode npm run modelagem.' });
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Não foi possível copiar', detail: 'O navegador recusou o acesso à área de transferência.' });
    }
  }

  aoEntrarNaTabela(nome: string): void {
    this.emHover.set(nome);
  }

  aoSairDaTabela(): void {
    this.emHover.set(null);
  }

  aoPressionarTabela(evento: PointerEvent, tabela: ModelagemTabela): void {
    if (evento.button !== 0) return;
    this.arrasto = { nome: tabela.nome, clienteX: evento.clientX, clienteY: evento.clientY, origemX: tabela.x, origemY: tabela.y, moveu: false };
    (evento.currentTarget as Element).setPointerCapture?.(evento.pointerId);
  }

  aoMoverTabela(evento: PointerEvent): void {
    const arrasto = this.arrasto;
    if (!arrasto) return;
    const deslocadoX = evento.clientX - arrasto.clienteX;
    const deslocadoY = evento.clientY - arrasto.clienteY;
    if (!arrasto.moveu && Math.abs(deslocadoX) + Math.abs(deslocadoY) < MOVIMENTO_MINIMO_PARA_ARRASTAR) return;
    arrasto.moveu = true;
    const escala = this.camera().escala;
    this.posicoes.update((atuais) => ({
      ...atuais,
      [arrasto.nome]: { x: Math.round(arrasto.origemX + deslocadoX / escala), y: Math.round(arrasto.origemY + deslocadoY / escala) },
    }));
  }

  aoSoltarTabela(): void {
    const arrasto = this.arrasto;
    this.arrasto = null;
    if (arrasto && !arrasto.moveu) this.alternarSelecao(arrasto.nome);
  }

  aoTeclarTabela(evento: Event, nome: string): void {
    evento.preventDefault();
    this.alternarSelecao(nome);
  }

  aoClicarNoFundo(evento: MouseEvent): void {
    if (evento.target === this.elementoSvg().nativeElement) this.selecionada.set(null);
  }

  private alternarSelecao(nome: string): void {
    this.selecionada.set(this.selecionada() === nome ? null : nome);
  }

  private areaVisivel(): { largura: number; altura: number } {
    const caixa = this.elementoSvg().nativeElement.getBoundingClientRect();
    return { largura: caixa.width || LARGURA_PADRAO, altura: caixa.height || ALTURA_PADRAO };
  }

  private aplicarTransformacao(transformacao: d3.ZoomTransform, animar: boolean): void {
    const alvo = animar ? this.selecaoSvg!.transition().duration(250) : this.selecaoSvg!;
    (alvo as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(this.comportamentoZoom!.transform, transformacao);
  }

  private acompanharTamanhoDaJanela(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => {
      if (this.enquadramentoAutomatico) this.enquadrarTudo(false);
    });
    observador.observe(this.elementoSvg().nativeElement);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }

  private iniciarZoom(): void {
    this.selecaoSvg = d3.select(this.elementoSvg().nativeElement);
    this.comportamentoZoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .extent((): [[number, number], [number, number]] => {
        const { largura, altura } = this.areaVisivel();
        return [[0, 0], [largura, altura]];
      })
      // Arrastar uma tabela move a tabela; o deslocamento do fundo e o zoom pela roda ficam com o d3.
      .filter((evento: Event) => {
        if (evento.type === 'wheel') return true;
        const clique = evento as MouseEvent;
        return !clique.ctrlKey && !clique.button && !(evento.target as Element).closest('.modelagem-diagrama__tabela');
      })
      .on('zoom', (evento) => {
        // `sourceEvent` só existe quando foi a pessoa (roda, arrasto, atalho de teclado do d3); o enquadramento programático não tem.
        if (evento.sourceEvent) this.enquadramentoAutomatico = false;
        this.camera.set({ x: evento.transform.x, y: evento.transform.y, escala: evento.transform.k });
      });
    this.selecaoSvg.call(this.comportamentoZoom).on('dblclick.zoom', null);
  }
}
