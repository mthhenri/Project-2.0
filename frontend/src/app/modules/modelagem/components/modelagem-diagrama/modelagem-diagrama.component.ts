import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, model, output, signal, untracked, viewChild } from '@angular/core';
import * as d3 from 'd3';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import type { ModelagemDiagramaDto, ModelagemTabelaDto } from '@project20/shared';
import {
  ALTURA_CABECALHO_TABELA,
  ALTURA_LINHA_TABELA,
  alturaDaTabela,
  caminhoDaAresta,
  colunaCasaBusca,
  enquadrar,
  grupoDaTabela,
  grupoSobOPonto,
  gruposDoDiagrama,
  ID_FORA_DA_MODELAGEM,
  montarArestas,
  retanguloDasTabelas,
  tabelaCasaBusca,
  vizinhasDe,
} from '../../utils/modelagem.util';

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
 * `ModelagemDiagramaDto` que o backend monta do catálogo do banco (`GET /modelagem`).
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
  readonly diagrama = input.required<ModelagemDiagramaDto>();
  /** Grupos exibidos; o resto some junto com as ligações que chegam a ele. */
  readonly gruposVisiveis = input.required<ReadonlySet<number>>();
  /** Gestor e administrador: soltar uma tabela depois de arrastá-la a grava (e, se ela estava fora da modelagem, a põe no grupo onde caiu). Para os outros o arrasto é só da vista, local. */
  readonly podeEditar = input<boolean>(false);
  readonly busca = input<string>('');
  readonly selecionada = model<string | null>(null);
  /**
   * Emitido ao soltar uma tabela arrastada (só quando `podeEditar`): a tela grava a posição. `grupoId` é o grupo em cuja caixa uma
   * tabela que estava fora da modelagem caiu (ela entra nele); para tabela que já está na modelagem é sempre `null` (mudar de grupo é
   * pelo painel, porque as caixas se sobrepõem e soltar na caixa errada por acidente não pode regrupar).
   */
  readonly tabelaSolta = output<{ nome: string; x: number; y: number; grupoId: number | null }>();
  readonly idForaDaModelagem = ID_FORA_DA_MODELAGEM;

  private readonly elementoSvg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
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

  readonly tabelas = computed<ModelagemTabelaDto[]>(() => {
    const movidas = this.posicoes();
    return this.diagrama().tabelas.map((tabela) => (movidas[tabela.nome] ? { ...tabela, ...movidas[tabela.nome] } : tabela));
  });
  private readonly tabelaPorNome = computed(() => new Map(this.tabelas().map((tabela) => [tabela.nome, tabela])));
  private readonly arestas = computed(() => montarArestas(this.tabelas()));
  /** Os grupos do banco mais o "Sem grupo" quando há tabela sem grupo. */
  private readonly grupos = computed(() => gruposDoDiagrama(this.diagrama()));
  private readonly coresPorGrupo = computed(() => new Map(this.grupos().map((grupo) => [grupo.id, grupo.corIndice])));

  private readonly foco = computed(() => this.emHover() ?? this.selecionada());
  private readonly vizinhasDoFoco = computed(() => (this.foco() ? vizinhasDe(this.foco() as string, this.arestas()) : null));
  private readonly temBusca = computed(() => this.busca().trim().length > 0);

  readonly tabelasVisiveis = computed(() =>
    this.tabelas()
      .filter((tabela) => this.gruposVisiveis().has(grupoDaTabela(tabela)))
      .map((tabela) => {
        const vizinhas = this.vizinhasDoFoco();
        const apagada = vizinhas ? !vizinhas.has(tabela.nome) : this.temBusca() && !tabelaCasaBusca(tabela, this.busca());
        return {
          tabela,
          cor: this.coresPorGrupo().get(grupoDaTabela(tabela)) ?? 0,
          altura: alturaDaTabela(tabela),
          apagada,
          selecionada: tabela.nome === this.selecionada(),
          achadaNaBusca: !vizinhas && this.temBusca() && !apagada,
          linhas: tabela.colunas.map((coluna) => ({ coluna, achada: colunaCasaBusca(coluna, this.busca()) })),
        };
      }),
  );

  readonly caixasDeGrupo = computed(() =>
    this.grupos().flatMap((grupo) => {
      const retangulo = retanguloDasTabelas(
        this.tabelas().filter((tabela) => grupoDaTabela(tabela) === grupo.id && this.gruposVisiveis().has(grupo.id)),
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
      if (!origem || !destino || !visiveis.has(grupoDaTabela(origem)) || !visiveis.has(grupoDaTabela(destino))) return [];
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
    // Quando a posição chega gravada no diagrama, o deslocamento local dessa tabela já não é necessário (e não deve esconder mudanças futuras).
    effect(() => {
      const tabelasGravadas = new Map(this.diagrama().tabelas.map((tabela) => [tabela.nome, tabela]));
      untracked(() =>
        this.posicoes.update((locais) => {
          const restantes = Object.entries(locais).filter(([nome, posicao]) => {
            const gravada = tabelasGravadas.get(nome);
            return gravada && (gravada.x !== posicao.x || gravada.y !== posicao.y);
          });
          return restantes.length === Object.keys(locais).length ? locais : Object.fromEntries(restantes);
        }),
      );
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
      this.tabelas().filter((tabela) => this.gruposVisiveis().has(grupoDaTabela(tabela))),
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

  /** Desfaz o deslocamento local de uma tabela (a gravação falhou): ela volta para onde o diagrama a tem. */
  descartarPosicao(nome: string): void {
    this.posicoes.update(({ [nome]: _descartada, ...restantes }) => restantes);
  }

  aoEntrarNaTabela(nome: string): void {
    this.emHover.set(nome);
  }

  aoSairDaTabela(): void {
    this.emHover.set(null);
  }

  aoPressionarTabela(evento: PointerEvent, tabela: ModelagemTabelaDto): void {
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
    if (!arrasto) return;
    if (!arrasto.moveu) {
      this.alternarSelecao(arrasto.nome);
      return;
    }
    const posicao = this.posicoes()[arrasto.nome];
    if (!this.podeEditar() || !posicao) return;
    const tabela = this.tabelaPorNome().get(arrasto.nome);
    const estavaFora = tabela?.grupoId === null;
    const centro = { x: posicao.x + (tabela?.largura ?? 0) / 2, y: posicao.y + (tabela ? alturaDaTabela(tabela) : 0) / 2 };
    const caixasDeOutrosGrupos = this.caixasDeGrupo().filter((caixa) => caixa.grupo.id !== ID_FORA_DA_MODELAGEM);
    this.tabelaSolta.emit({ nome: arrasto.nome, x: posicao.x, y: posicao.y, grupoId: estavaFora ? grupoSobOPonto(caixasDeOutrosGrupos, centro) : null });
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
