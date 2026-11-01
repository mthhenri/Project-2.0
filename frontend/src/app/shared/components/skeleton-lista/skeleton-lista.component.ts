import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { CelulaDoEsqueleto } from './esqueleto-tabela';

/**
 * Esqueleto da primeira carga (task 98): reserva o espaço do conteúdo real para a tela não
 * saltar quando os dados chegam. `tabela` = linhas com colunas; `cartoes` = grade de cartões;
 * `linhas` = lista simples (árvore, justificativas).
 *
 * Para o esqueleto não parecer outra tela, a página que conhece o layout real o informa: `cabecalhos` (os rótulos reais da tabela, que
 * não precisam esperar os dados e definem o número de colunas), `larguras` (o `grid-template-columns` da tabela real), `alturaLinha`
 * (a altura de uma linha real) e, nos cartões, `larguraMinima` e `alturaCartao`. Sem eles valem os padrões genéricos.
 */
@Component({
    selector: 'app-skeleton-lista',
    standalone: true,
    imports: [SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './skeleton-lista.component.html',
    styleUrl: './skeleton-lista.component.scss',
})
export class SkeletonListaComponent {
    @Input() variante: 'tabela' | 'cartoes' | 'linhas' = 'tabela';
    @Input() set quantidade(valor: number) { this.itens.set(Array.from({ length: Math.max(1, valor) }, (_, indiceSelecionado) => indiceSelecionado)); }
    @Input() set colunas(valor: number) { this.celulas.set(Array.from({ length: Math.max(1, valor) }, (_, indicePrincipal) => indicePrincipal)); }

    /** Rótulos reais da tabela, mostrados como texto; quando informados, definem as colunas (a entrada `colunas` é ignorada). */
    @Input() set cabecalhos(valor: readonly string[]) {
        this.rotulos.set(valor);
        if (valor.length > 0) this.celulas.set(Array.from({ length: valor.length }, (_, indiceSeguinte) => indiceSeguinte));
    }
    /** `grid-template-columns` da tabela real (ex.: `2fr 1fr 1fr 6rem`); sem ele, colunas de largura igual. */
    @Input() set larguras(valor: string) { this.modeloDeColunas.set(valor); }
    /** Forma de cada célula da tabela real (avatar, selo, interruptor…); sem ela, uma linha de texto em cada coluna. */
    @Input() set formas(valor: readonly CelulaDoEsqueleto[]) { this.formasDaCelula.set(valor); }
    /** Largura mínima da tabela real (ex.: `60rem`): abaixo dela a tabela rola na horizontal, e o esqueleto também, em vez de espremer as colunas. */
    @Input() larguraMinimaTabela = '';
    /** Altura de uma linha da tabela real (ex.: `3.25rem`). */
    @Input() alturaLinha = '';
    /** Largura mínima de cada cartão na grade (ex.: `18rem`); define quantos cabem por linha, como na grade real. */
    @Input() larguraMinima = '14rem';
    /** Espaço entre os cartões da grade (ex.: `10px`); o padrão é o da maioria das grades. */
    @Input() espacamento = '0.75rem';
    /** Altura de cada cartão (ex.: `8.5rem`). */
    @Input() alturaCartao = '3.25rem';

    readonly formasDaCelula = signal<readonly CelulaDoEsqueleto[]>([]);
    readonly rotulos = signal<readonly string[]>([]);
    private readonly modeloDeColunas = signal<string>('');
    readonly itens = signal<number[]>(Array.from({ length: 6 }, (_, indiceAtual) => indiceAtual));
    readonly celulas = signal<number[]>(Array.from({ length: 5 }, (_, indice) => indice));
    readonly colunasCss = computed(() => this.modeloDeColunas() || `repeat(${this.celulas().length}, minmax(0, 1fr))`);
    readonly grade = computed(() => `repeat(auto-fill, minmax(${this.larguraMinima}, 1fr))`);
}
