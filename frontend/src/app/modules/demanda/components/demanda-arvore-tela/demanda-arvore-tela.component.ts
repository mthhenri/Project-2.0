import { Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DemandaGrafoNoDto, TagResumoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { CampoDescricaoDemanda, DemandaMenuAcoes } from '../../utils/demanda-context-menu.factory';
import { DemandaFiltro, filtroAtivo, nosCorrespondentes } from '../../utils/demanda-filtro.util';
import {
  PastaId,
  ancestraisDaPasta,
  caminhoDaPasta,
  construirPastas,
  contarSemPasta,
  demandasDaPasta,
  listarPastasEmOrdem,
  pastaDaDemanda,
} from '../../utils/demanda-pasta.util';
import { AbaDemandaAberta, DemandaAbertaComponent } from '../demanda-aberta/demanda-aberta.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaPastaListaComponent } from '../demanda-pasta-lista/demanda-pasta-lista.component';
import { DemandaPastasComponent } from '../demanda-pastas/demanda-pastas.component';

/**
 * A Árvore de demandas em três colunas (task 239): as pastas (demandas de estrutura), as demandas que estão direto na pasta escolhida e a demanda
 * aberta. Recebe os nós do projeto e o filtro da toolbar; a pasta escolhida é da página (fica na URL), então só a emite. A busca olha todas as
 * pastas; os filtros de status e tags valem dentro da pasta escolhida.
 */
@Component({
  selector: 'app-demanda-arvore-tela',
  standalone: true,
  imports: [DemandaPastasComponent, DemandaPastaListaComponent, DemandaAbertaComponent, DemandaFormularioDialogComponent],
  templateUrl: './demanda-arvore-tela.component.html',
  styleUrl: './demanda-arvore-tela.component.scss',
})
export class DemandaArvoreTelaComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);

  readonly nos = input.required<DemandaGrafoNoDto[]>();
  readonly filtro = input.required<DemandaFiltro>();
  readonly projetoId = input.required<number>();
  /** A pasta escolhida (da página): um id, ou `null` para "Sem pasta". */
  readonly pastaId = input<PastaId>(null);
  /** A demanda a abrir de fora (clique no grafo ou no Controle de horas); o número muda a cada pedido. */
  readonly abrirDemanda = input<{ id: number; versao: number } | null>(null);

  readonly pastaChange = output<PastaId>();
  readonly alterado = output<void>();
  readonly statusAlterado = output<{ demandaId: number; status: TipoDemandaStatusEnum }>();
  readonly tagsAlteradas = output<{ demandaId: number; tags: TagResumoDto[] }>();
  readonly filtrosLimpos = output<void>();
  readonly demandaEditarSolicitada = output<number>();
  readonly demandaNovaFilhaSolicitada = output<number>();
  readonly demandaTagsSolicitadas = output<number>();
  readonly demandaMembrosSolicitados = output<number>();
  readonly demandaDescricaoSolicitada = output<{ id: number; campo: CampoDescricaoDemanda }>();

  private readonly pastasComponente = viewChild(DemandaPastasComponent);
  private readonly aberta = viewChild(DemandaAbertaComponent);

  readonly demandaAbertaId = signal<number | null>(null);
  readonly aba = signal<AbaDemandaAberta>('tecnica');
  readonly expandidas = signal<ReadonlySet<number>>(new Set());
  readonly mostrarDemandaAqui = signal<boolean>(false);
  /** O filtro "Projeto inteiro": a lista traz todas as demandas, cada uma com o caminho acima do nome. Só da tela; escolher uma pasta o desfaz. */
  readonly projetoInteiro = signal<boolean>(false);

  readonly pastas = computed(() => construirPastas(this.nos()));
  readonly semPastaQuantidade = computed(() => contarSemPasta(this.nos()));
  readonly emBusca = computed(() => this.filtro().termo.trim() !== '');
  readonly filtroEstaAtivo = computed(() => filtroAtivo(this.filtro()));

  /** As demandas da lista: as da pasta escolhida ou, com busca, as de todas as pastas; em qualquer caso, só as que passam no filtro. */
  readonly itens = computed<DemandaGrafoNoDto[]>(() => {
    const todos = this.nos();
    return this.emBusca() || this.projetoInteiro() ? nosCorrespondentes(todos, this.filtro()) : nosCorrespondentes(demandasDaPasta(todos, this.pastaId()), this.filtro());
  });

  readonly nomesDasPastas = computed<ReadonlyMap<number, string> | null>(() =>
    this.emBusca() ? new Map(this.nos().filter((no) => no.isEstrutural).map((no) => [no.id, no.nome])) : null,
  );

  /** O caminho de cada demanda até a raiz ("Suporte › GR Sisger"), só no "Projeto inteiro" e fora da busca. */
  readonly caminhosDasDemandas = computed<ReadonlyMap<number, string> | null>(() => {
    if (this.emBusca() || !this.projetoInteiro()) return null;
    const porId = new Map(this.nos().map((no) => [no.id, no]));
    const caminhos = new Map<number, string>();
    for (const no of this.nos()) {
      const nomes: string[] = [];
      let pai = no.demandaPaiId ?? null;
      while (pai !== null && porId.has(pai) && nomes.length < 50) {
        nomes.unshift(porId.get(pai)!.nome);
        pai = porId.get(pai)!.demandaPaiId ?? null;
      }
      caminhos.set(no.id, nomes.join(' › '));
    }
    return caminhos;
  });

  readonly tituloDaLista = computed(() => {
    if (this.emBusca()) return 'Resultados da busca';
    if (this.projetoInteiro()) return 'Projeto inteiro';
    const caminho = caminhoDaPasta(this.nos(), this.pastaId());
    return caminho[caminho.length - 1];
  });

  readonly caminhoDaLista = computed(() => {
    if (this.emBusca() || this.projetoInteiro()) return `${this.itens().length} ${this.itens().length === 1 ? 'demanda' : 'demandas'} em todas as pastas`;
    return caminhoDaPasta(this.nos(), this.pastaId()).slice(0, -1).join(' › ');
  });

  /** O id da demanda que é a própria pasta (para "Abrir pasta"); nada em "Sem pasta" e na busca. */
  readonly pastaDemandaId = computed<number | null>(() => (this.emBusca() || this.projetoInteiro() ? null : this.pastaId()));

  readonly noAberto = computed(() => this.nos().find((no) => no.id === this.demandaAbertaId()) ?? null);

  readonly todosExpandidos = computed(() => {
    const comFilhas = listarPastasEmOrdem(this.pastas()).filter((pasta) => pasta.filhas.length > 0);
    return comFilhas.length > 0 && comFilhas.every((pasta) => this.expandidas().has(pasta.id));
  });

  /** Os callbacks do menu de contexto da linha: "Visualizar" abre na coluna; o resto vai para a página, que tem os diálogos. */
  readonly acoesMenu: DemandaMenuAcoes = {
    aoVisualizar: (id) => this.escolherDemanda(id),
    aoEditar: (id) => this.demandaEditarSolicitada.emit(id),
    aoNovaFilha: (id) => this.demandaNovaFilhaSolicitada.emit(id),
    aoTags: (id) => this.demandaTagsSolicitadas.emit(id),
    aoMembros: (id) => this.demandaMembrosSolicitados.emit(id),
    aoDescricao: (id, campo) => this.demandaDescricaoSolicitada.emit({ id, campo }),
  };

  constructor() {
    // A pasta escolhida abre os ramos até ela.
    effect(() => {
      const pasta = this.pastaId();
      const todos = this.nos();
      if (pasta === null) return;
      const ancestrais = ancestraisDaPasta(todos, pasta);
      untracked(() => {
        if (ancestrais.some((id) => !this.expandidas().has(id))) this.expandidas.update((atual) => new Set([...atual, ...ancestrais]));
      });
    });

    // A demanda aberta some da lista (excluída ou outra pasta): abre a primeira da pasta, ou nenhuma.
    effect(() => {
      const itens = this.itens();
      const todos = this.nos();
      untracked(() => {
        const aberta = this.demandaAbertaId();
        if (aberta !== null && todos.some((no) => no.id === aberta)) return;
        this.demandaAbertaId.set(this.emBusca() ? null : (itens[0]?.id ?? null));
      });
    });

    // Pedido de fora: abre a demanda (e a pasta dela).
    effect(() => {
      const pedido = this.abrirDemanda();
      if (!pedido) return;
      untracked(() => {
        this.projetoInteiro.set(false);
        this.escolherDemanda(pedido.id);
      });
    });
  }

  /** Dá o foco do teclado à coluna das pastas. */
  focar(): void {
    this.pastasComponente()?.focar();
  }

  /** Recarrega a demanda aberta (mudou por fora, por exemplo, por um diálogo da página). */
  recarregar(): void {
    this.aberta()?.atualizar();
  }

  alternarExpansao(id: number): void {
    this.expandidas.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  alternarExpansaoGeral(): void {
    if (this.todosExpandidos()) this.expandidas.set(new Set());
    else this.expandidas.set(new Set(listarPastasEmOrdem(this.pastas()).filter((pasta) => pasta.filhas.length > 0).map((pasta) => pasta.id)));
  }

  /** Clicar numa pasta: ela vira a escolhida e a primeira demanda dela abre. */
  escolherPasta(pasta: PastaId): void {
    this.projetoInteiro.set(false);
    this.pastaChange.emit(pasta);
    const primeira = nosCorrespondentes(demandasDaPasta(this.nos(), pasta), { ...this.filtro(), termo: '' })[0];
    this.demandaAbertaId.set(primeira?.id ?? null);
    this.aba.set('tecnica');
  }

  /** "Projeto inteiro": a lista mostra todas as demandas; a demanda aberta continua aberta. */
  escolherProjetoInteiro(): void {
    this.projetoInteiro.set(true);
  }

  /** Abre uma demanda na terceira coluna; vinda da busca ou de fora, a pasta dela passa a ser a escolhida. */
  escolherDemanda(id: number, aba: AbaDemandaAberta = 'tecnica'): void {
    const pasta = pastaDaDemanda(this.nos(), id);
    if (pasta !== undefined && pasta !== this.pastaId()) this.pastaChange.emit(pasta);
    this.demandaAbertaId.set(id);
    this.aba.set(aba);
  }

  abrirDescricao(pedido: { id: number; campo: CampoDescricaoDemanda }): void {
    this.escolherDemanda(pedido.id, pedido.campo === 'descricaoTecnica' ? 'tecnica' : pedido.campo === 'descricaoCliente' ? 'cliente' : 'doc');
  }

  /** A demanda mostrada mudou por dentro (caminho, conexão, "Voltar"): acompanha a seleção e a pasta, sem recarregar. */
  aoNavegar(id: number): void {
    this.demandaAbertaId.set(id);
    const pasta = pastaDaDemanda(this.nos(), id);
    if (pasta !== undefined && pasta !== this.pastaId()) this.pastaChange.emit(pasta);
  }

  /** Troca de status pela bolinha da linha: otimista, com rollback se a API recusar. */
  aoStatusEscolhido(alteracao: { demandaId: number; de: TipoDemandaStatusEnum; para: TipoDemandaStatusEnum }): void {
    this.statusAlterado.emit({ demandaId: alteracao.demandaId, status: alteracao.para });
    this.demandaService.alterar(alteracao.demandaId, { status: alteracao.para }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso) {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
          if (alteracao.demandaId === this.demandaAbertaId()) this.recarregar();
        }
      },
      error: () => this.statusAlterado.emit({ demandaId: alteracao.demandaId, status: alteracao.de }),
    });
  }

  aoExcluida(): void {
    this.demandaAbertaId.set(null);
    this.alterado.emit();
  }

  aoDemandaAquiCriada(): void {
    this.alterado.emit();
  }
}
