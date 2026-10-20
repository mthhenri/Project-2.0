import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';
import { max, scaleBand, scaleLinear } from 'd3';

/** Uma barra do gráfico. `valor` e a linha de referência estão na mesma unidade (o eixo mostra o número como vem). */
export interface GraficoBarrasBarra {
  valor: number;
  /** Cor de preenchimento (hex ou `var(--token)`), aplicada por `style.fill`. */
  cor: string;
  /** Texto curto acima da barra. */
  rotulo: string;
  /** Texto completo do tooltip e da descrição acessível. */
  descricao: string;
  /** Realce que não depende da cor (contorno e valor em vermelho): o estouro precisa aparecer mesmo num projeto de cor vermelha. */
  destaque?: boolean;
}

/** Um grupo de barras sob o mesmo rótulo do eixo horizontal (um projeto, um mês). */
export interface GraficoBarrasCategoria {
  rotulo: string;
  /** Rótulo completo, usado no tooltip quando o do eixo é cortado. */
  descricao?: string;
  barras: GraficoBarrasBarra[];
}

interface BarraDesenhada extends GraficoBarrasBarra {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface CategoriaDesenhada {
  rotulo: string;
  descricao: string;
  centroX: number;
  barras: BarraDesenhada[];
}

const MARGEM = { superior: 22, direita: 12, inferior: 34, esquerda: 44 };
const LARGURA_PADRAO = 640;
/** Abaixo desta largura de barra o rótulo de valor não cabe e fica só no tooltip. */
const LARGURA_MINIMA_DO_ROTULO = 34;

/**
 * Gráfico de barras agrupadas em SVG (task 199): as escalas vêm do d3 e o desenho é do próprio template, sem manipular o DOM. Responde à
 * largura do contêiner, mostra o eixo em números como chegam, uma linha de referência tracejada opcional e tooltip nativo (`<title>`) em cada barra.
 */
@Component({
  selector: 'app-grafico-barras',
  standalone: true,
  templateUrl: './grafico-barras.component.html',
  styleUrl: './grafico-barras.component.scss',
})
export class GraficoBarrasComponent {
  readonly categorias = input.required<GraficoBarrasCategoria[]>();
  /** Valor da linha tracejada (o esperado por mês, por exemplo); `null` não desenha. */
  readonly linhaReferencia = input<number | null>(null);
  readonly rotuloLinhaReferencia = input<string>('');
  readonly altura = input<number>(280);
  /** Descrição do gráfico para leitores de tela. */
  readonly descricaoGeral = input<string>('Gráfico de barras');
  /** Sufixo dos números do eixo vertical (ex.: " h"). */
  readonly unidadeDoEixo = input<string>('');
  /** Empilha as barras de cada categoria numa só coluna (o eixo vai até a maior soma) em vez de lado a lado. */
  readonly empilhado = input<boolean>(false);

  private readonly conteiner = viewChild<ElementRef<HTMLElement>>('conteiner');
  readonly largura = signal<number>(LARGURA_PADRAO);

  readonly margem = MARGEM;

  constructor() {
    effect((aoLimpar) => {
      const alvo = this.conteiner()?.nativeElement;
      if (!alvo || typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver((entradas) => {
        const nova = Math.floor(entradas[0]?.contentRect.width ?? 0);
        if (nova > 0) this.largura.set(nova);
      });
      observador.observe(alvo);
      aoLimpar(() => observador.disconnect());
    });
  }

  private readonly escalaY = computed(() => {
    const somar = (valores: number[]) => valores.reduce((soma, valor) => soma + valor, 0);
    const valores = this.empilhado()
      ? this.categorias().map((categoria) => somar(categoria.barras.map((barra) => barra.valor)))
      : this.categorias().flatMap((categoria) => categoria.barras.map((barra) => barra.valor));
    const maiorValor = max(valores) ?? 0;
    const teto = Math.max(maiorValor, this.linhaReferencia() ?? 0, 1);
    return scaleLinear().domain([0, teto]).nice().range([this.altura() - MARGEM.inferior, MARGEM.superior]);
  });

  readonly marcas = computed(() => {
    const escala = this.escalaY();
    return escala.ticks(5).map((valor) => ({ valor, y: escala(valor) }));
  });

  readonly linhaDeReferenciaY = computed(() => {
    const valor = this.linhaReferencia();
    return valor === null ? null : this.escalaY()(valor);
  });

  readonly categoriasDesenhadas = computed<CategoriaDesenhada[]>(() => {
    const categorias = this.categorias();
    const escalaY = this.escalaY();
    const base = escalaY(0);
    const escalaCategoria = scaleBand<number>()
      .domain(categorias.map((_, indice) => indice))
      .range([MARGEM.esquerda, Math.max(MARGEM.esquerda + 1, this.largura() - MARGEM.direita)])
      .paddingInner(0.25)
      .paddingOuter(0.1);
    const larguraDaCategoria = escalaCategoria.bandwidth();
    const empilhado = this.empilhado();

    return categorias.map((categoria, indice) => {
      const inicio = escalaCategoria(indice) ?? MARGEM.esquerda;
      let acumulado = 0;
      const escalaBarra = scaleBand<number>()
        .domain(categoria.barras.map((_, posicao) => posicao))
        .range([0, larguraDaCategoria])
        .paddingInner(0.08);
      return {
        rotulo: categoria.rotulo,
        descricao: categoria.descricao ?? categoria.rotulo,
        centroX: inicio + larguraDaCategoria / 2,
        barras: categoria.barras.map((barra, posicao) => {
          if (empilhado) {
            const baseDoSegmento = escalaY(acumulado);
            acumulado += barra.valor;
            const topoDoSegmento = escalaY(acumulado);
            return { ...barra, x: inicio, y: topoDoSegmento, largura: larguraDaCategoria, altura: Math.max(0, baseDoSegmento - topoDoSegmento) };
          }
          const topo = escalaY(barra.valor);
          return {
            ...barra,
            x: inicio + (escalaBarra(posicao) ?? 0),
            y: topo,
            largura: escalaBarra.bandwidth(),
            altura: Math.max(0, base - topo),
          };
        }),
      };
    });
  });

  /** Se a barra é larga o bastante para o rótulo de valor acima dela. */
  cabeRotulo(barra: BarraDesenhada): boolean {
    return barra.largura >= LARGURA_MINIMA_DO_ROTULO;
  }

  /** Corta o rótulo do eixo quando a categoria é estreita (o completo fica no tooltip). */
  rotuloDoEixo(categoria: CategoriaDesenhada): string {
    const larguraDaCategoria = categoria.barras.reduce((soma, barra) => soma + barra.largura, 0);
    const caracteresQueCabem = Math.max(3, Math.floor(larguraDaCategoria / 7));
    return categoria.rotulo.length > caracteresQueCabem ? `${categoria.rotulo.slice(0, caracteresQueCabem - 1)}…` : categoria.rotulo;
  }
}
