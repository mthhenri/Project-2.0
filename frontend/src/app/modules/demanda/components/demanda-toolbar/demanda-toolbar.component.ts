import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { TagResumoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { OPCOES_STATUS_DEMANDA } from '../../constants/demanda-cores.constants';
import { DemandaStatusMarcaComponent } from '../demanda-status-marca/demanda-status-marca.component';
import { DemandaFiltro, alternarStatusVisivel, filtroAtivo, statusVisiveis } from '../../utils/demanda-filtro.util';

/**
 * Toolbar de Demandas (task 106): busca instantânea, chips-contador de status e filtro de tags.
 * Só apresenta e emite o filtro; quem aplica (Lista e Grafo) é a página. A busca é focada por `/`.
 */
@Component({
  selector: 'app-demanda-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, MultiSelectModule, TooltipModule, DemandaStatusMarcaComponent],
  templateUrl: './demanda-toolbar.component.html',
  styleUrl: './demanda-toolbar.component.scss',
})
export class DemandaToolbarComponent {
  readonly filtro = input.required<DemandaFiltro>();
  readonly contagem = input.required<Record<TipoDemandaStatusEnum, number>>();
  readonly tagsDisponiveis = input<TagResumoDto[]>([]);
  /** Só a Lista tem árvore para expandir/recolher. */
  readonly mostrarExpansao = input<boolean>(false);
  readonly todosExpandidos = input<boolean>(false);

  readonly filtroAlterado = output<DemandaFiltro>();
  readonly limpar = output<void>();
  readonly expansaoAlternada = output<void>();

  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');

  readonly ativo = computed(() => filtroAtivo(this.filtro()));

  readonly chips = OPCOES_STATUS_DEMANDA;

  focarBusca(): void {
    const campo = this.campoBusca()?.nativeElement;
    campo?.focus();
    campo?.select();
  }

  aoDigitar(termo: string): void {
    this.filtroAlterado.emit({ ...this.filtro(), termo });
  }

  /** Chip ligado = status visível; 1 clique esconde (ou volta a mostrar) aquele status. */
  alternarStatus(status: TipoDemandaStatusEnum): void {
    this.filtroAlterado.emit({ ...this.filtro(), status: alternarStatusVisivel(this.filtro(), status) });
  }

  aoMudarTags(tagIds: number[]): void {
    this.filtroAlterado.emit({ ...this.filtro(), tagIds: tagIds ?? [] });
  }

  statusAtivo(status: TipoDemandaStatusEnum): boolean {
    return statusVisiveis(this.filtro()).includes(status);
  }

  /** Esc limpa a busca; com a busca já vazia, devolve o foco à página. */
  aoTeclarBusca(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape') return;
    if (this.filtro().termo) this.aoDigitar('');
    else (evento.target as HTMLElement).blur();
  }
}
