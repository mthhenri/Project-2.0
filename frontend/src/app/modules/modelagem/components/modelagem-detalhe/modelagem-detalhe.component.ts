import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ModelagemDiagramaDto } from '@project20/shared';
import { montarArestas } from '../../utils/modelagem.util';

/**
 * Painel lateral da tela Modelagem: sem tabela escolhida mostra o resumo do banco e os avisos da geração; com uma
 * escolhida, as colunas e as relações (para onde ela aponta e quem aponta para ela), cada uma clicável.
 */
@Component({
  selector: 'app-modelagem-detalhe',
  standalone: true,
  templateUrl: './modelagem-detalhe.component.html',
  styleUrl: './modelagem-detalhe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelagemDetalheComponent {
  readonly diagrama = input.required<ModelagemDiagramaDto>();
  readonly selecionada = input<string | null>(null);
  readonly tabelaEscolhida = output<string>();

  private readonly arestas = computed(() => montarArestas(this.diagrama().tabelas));

  readonly resumo = computed(() => ({
    tabelas: this.diagrama().tabelas.length,
    chavesEstrangeiras: this.arestas().filter((aresta) => !aresta.logica).length,
    colunas: this.diagrama().tabelas.reduce((total, tabela) => total + tabela.colunas.length, 0),
  }));

  readonly tabela = computed(() => this.diagrama().tabelas.find((candidata) => candidata.nome === this.selecionada()) ?? null);

  readonly rotuloDoGrupo = computed(() => {
    const grupo = this.diagrama().grupos.find((candidato) => candidato.id === this.tabela()?.grupo);
    return grupo?.rotulo ?? this.tabela()?.grupo ?? '';
  });

  readonly referencia = computed(() => this.arestas().filter((aresta) => aresta.origem === this.selecionada()));
  readonly referenciadaPor = computed(() => this.arestas().filter((aresta) => aresta.destino === this.selecionada() && aresta.origem !== this.selecionada()));
}
