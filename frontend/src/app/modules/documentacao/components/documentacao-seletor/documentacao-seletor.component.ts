import { Component, computed, effect, ElementRef, input, output, signal, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaDocumentacaoResumoDto } from '@project20/shared';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { dividirDestaque } from '../../../demanda/utils/demanda-filtro.util';
import { caminhoDaDemanda, montarArvoreDocumentacao, NoDocumentacao, recortarPelaBusca } from '../../utils/documentacao-arvore.util';

/**
 * O seletor da demanda em que a pessoa está trabalhando (task 259), no padrão do seletor do chat: o botão mostra a bolinha de status, o nome, o caminho e
 * "Rodando"; o popover tem a busca (sem acento e sem diferenciar caixa, com o termo destacado e os ancestrais mantidos) e a árvore projeto → demandas
 * aninhadas, cada demanda com a bolinha de status, "Rodando" e as três marcas de preenchimento (técnica, cliente e documentação; cinza quando vazio).
 */
@Component({
  selector: 'app-documentacao-seletor',
  standalone: true,
  imports: [NgTemplateOutlet, ReactiveFormsModule, ButtonModule, InputTextModule, PopoverModule, SkeletonModule, TooltipModule, DemandaStatusMarcaComponent],
  templateUrl: './documentacao-seletor.component.html',
  styleUrl: './documentacao-seletor.component.scss',
})
export class DocumentacaoSeletorComponent {
  readonly demandas = input.required<DemandaDocumentacaoResumoDto[]>();
  readonly escolhidaId = input<number | null>(null);
  readonly carregando = input(false);
  readonly erro = input(false);

  readonly escolheu = output<number>();
  readonly recarregar = output<void>();

  private readonly popover = viewChild<Popover>('popover');
  private readonly gatilho = viewChild<ElementRef<HTMLElement>>('gatilho');
  readonly controleBusca = new FormControl<string>('', { nonNullable: true });
  private readonly termo = signal('');
  /** Os nós que o usuário abriu ou fechou à mão; o que a busca abre vem por cima. */
  private readonly abertosPelaPessoa = signal<ReadonlySet<string>>(new Set());
  private readonly fechadosPelaPessoa = signal<ReadonlySet<string>>(new Set());

  readonly escolhida = computed(() => this.demandas().find((demanda) => demanda.id === this.escolhidaId()) ?? null);
  readonly caminho = caminhoDaDemanda;
  readonly arvore = computed(() => montarArvoreDocumentacao(this.demandas()));
  readonly recorte = computed(() => recortarPelaBusca(this.demandas(), this.termo()));
  readonly buscando = computed(() => this.termo().trim() !== '');

  constructor() {
    this.controleBusca.valueChanges.subscribe((valor) => this.termo.set(valor));
    // A lista nova (recarregar) não deixa um termo antigo escondendo demandas que ninguém procurou.
    effect(() => {
      this.demandas();
      untracked(() => this.abertosPelaPessoa.set(new Set()));
    });
  }

  /** O nó aparece? Projeto: se alguma demanda dele aparece; demanda: se bate na busca ou é ancestral de quem bate. */
  visivel(no: NoDocumentacao): boolean {
    const recorte = this.recorte();
    return no.tipo === 'projeto' ? recorte.projetosVisiveis.has(Number(no.chave.split('-')[1])) : recorte.visiveis.has(no.demanda!.id);
  }

  /** Projetos começam abertos; as demandas, fechadas (menos o caminho da escolhida); a busca abre os ancestrais dos resultados. */
  aberto(no: NoDocumentacao): boolean {
    if (this.fechadosPelaPessoa().has(no.chave)) return false;
    if (this.abertosPelaPessoa().has(no.chave)) return true;
    if (this.buscando()) return this.recorte().expandir.has(no.chave);
    if (no.tipo === 'projeto') return true;
    return this.temEscolhidaDentro(no);
  }

  alternar(no: NoDocumentacao): void {
    const abrir = !this.aberto(no);
    const atualiza = (conjunto: ReadonlySet<string>, incluir: boolean) => {
      const novo = new Set(conjunto);
      if (incluir) novo.add(no.chave);
      else novo.delete(no.chave);
      return novo;
    };
    this.abertosPelaPessoa.update((conjunto) => atualiza(conjunto, abrir));
    this.fechadosPelaPessoa.update((conjunto) => atualiza(conjunto, !abrir));
  }

  /** Abre o popover pelo botão "Escolher demanda" da tela vazia. */
  abrir(): void {
    const botao = this.gatilho()?.nativeElement;
    if (botao) this.popover()?.show(new Event('click'), botao);
  }

  escolher(demanda: DemandaDocumentacaoResumoDto): void {
    this.escolheu.emit(demanda.id);
    this.popover()?.hide();
  }

  aoAbrir(): void {
    setTimeout(() => document.querySelector<HTMLInputElement>('.documentacao-seletor__busca-campo')?.focus());
  }

  limparBusca(): void {
    this.controleBusca.setValue('');
  }

  destacar(nome: string): { texto: string; destaque: boolean }[] {
    return dividirDestaque(nome, this.termo());
  }

  private temEscolhidaDentro(no: NoDocumentacao): boolean {
    const escolhidaId = this.escolhidaId();
    if (escolhidaId === null) return false;
    return no.filhos.some((filho) => filho.demanda?.id === escolhidaId || this.temEscolhidaDentro(filho));
  }
}
