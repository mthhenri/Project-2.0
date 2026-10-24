import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import type { ModelagemDiagramaDto } from '@project20/shared';
import { GRUPO_FORA_DA_MODELAGEM, grupoDaTabela, gruposDoDiagrama, montarArestas } from '../../utils/modelagem.util';

/**
 * Painel lateral da tela Modelagem: sem tabela escolhida mostra o resumo do banco e os avisos; com uma escolhida, as colunas e as
 * relações (para onde ela aponta e quem aponta para ela), cada uma clicável. Para quem edita (gestor e administrador), o grupo da
 * tabela é um seletor: trocar o grupo pede a gravação à tela.
 */
@Component({
  selector: 'app-modelagem-detalhe',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, SelectModule, TooltipModule],
  templateUrl: './modelagem-detalhe.component.html',
  styleUrl: './modelagem-detalhe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelagemDetalheComponent {
  readonly diagrama = input.required<ModelagemDiagramaDto>();
  readonly selecionada = input<string | null>(null);
  readonly podeEditar = input<boolean>(false);
  readonly tabelaEscolhida = output<string>();
  /** Pede para mover a tabela para outro grupo (`null` = tirá-la da modelagem: só o desenho muda, a tabela do banco fica). */
  readonly grupoEscolhido = output<{ nome: string; grupoId: number | null }>();

  /** O grupo da tabela escolhida (`null` = fora da modelagem); o seletor só o muda por ação da pessoa (trocar a tabela não emite). */
  readonly controleGrupo = new FormControl<number | null>(null);

  private readonly arestas = computed(() => montarArestas(this.diagrama().tabelas));

  readonly resumo = computed(() => ({
    tabelas: this.diagrama().tabelas.length,
    chavesEstrangeiras: this.arestas().filter((aresta) => !aresta.logica).length,
    colunas: this.diagrama().tabelas.reduce((total, tabela) => total + tabela.colunas.length, 0),
  }));

  readonly tabela = computed(() => this.diagrama().tabelas.find((candidata) => candidata.nome === this.selecionada()) ?? null);

  readonly rotuloDoGrupo = computed(() => {
    const tabela = this.tabela();
    if (!tabela) return '';
    return gruposDoDiagrama(this.diagrama()).find((grupo) => grupo.id === grupoDaTabela(tabela))?.rotulo ?? GRUPO_FORA_DA_MODELAGEM.rotulo;
  });

  /** As opções do seletor: os grupos do banco e, no fim, "Sem grupo". */
  readonly opcoesDeGrupo = computed(() => [...this.diagrama().grupos.map((grupo) => ({ id: grupo.id as number | null, rotulo: grupo.rotulo })), { id: null, rotulo: GRUPO_FORA_DA_MODELAGEM.rotulo }]);

  /** A tabela existe no banco mas não está na modelagem (está no canto do desenho). */
  readonly foraDaModelagem = computed(() => this.tabela()?.grupoId === null);

  readonly referencia = computed(() => this.arestas().filter((aresta) => aresta.origem === this.selecionada()));
  readonly referenciadaPor = computed(() => this.arestas().filter((aresta) => aresta.destino === this.selecionada() && aresta.origem !== this.selecionada()));

  /** Tira a tabela da modelagem (botão do painel): é o mesmo pedido de escolher "Fora da modelagem" no seletor. */
  tirarDaModelagem(): void {
    const tabela = this.tabela();
    if (tabela) this.grupoEscolhido.emit({ nome: tabela.nome, grupoId: null });
  }

  /** A gravação do grupo falhou: o seletor volta ao grupo que a tabela de fato tem. */
  redefinirGrupo(): void {
    this.controleGrupo.setValue(this.tabela()?.grupoId ?? null, { emitEvent: false });
  }

  constructor() {
    effect(() => this.controleGrupo.setValue(this.tabela()?.grupoId ?? null, { emitEvent: false }));
    this.controleGrupo.valueChanges.pipe(takeUntilDestroyed()).subscribe((grupoId) => {
      const tabela = this.tabela();
      if (tabela && grupoId !== tabela.grupoId) this.grupoEscolhido.emit({ nome: tabela.nome, grupoId });
    });
  }
}
