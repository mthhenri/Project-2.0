import { Component, computed, inject, input, model, output } from '@angular/core';
import { PopoverModule } from 'primeng/popover';
import { TagResumoDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';

/**
 * Tags da demanda no cabeçalho do detalhe (task 108): chips + "+ Tag" abre um popover com todas as tags em
 * toggle; cada clique grava na hora (otimista, com rollback). Substitui a aba "Tags" e o dialog "Editar Tags".
 */
@Component({
  selector: 'app-demanda-tags-cabecalho',
  standalone: true,
  imports: [PopoverModule],
  templateUrl: './demanda-tags-cabecalho.component.html',
  styleUrl: './demanda-tags-cabecalho.component.scss',
})
export class DemandaTagsCabecalhoComponent {
  private readonly demandaService = inject(DemandaService);

  readonly demandaId = input.required<number>();
  readonly tagsDisponiveis = input<TagResumoDto[]>([]);
  readonly editavel = input<boolean>(false);
  /** Tags atuais da demanda (bind de duas vias: o dialog guarda no cache de navegação). */
  readonly tags = model<TagResumoDto[]>([]);
  readonly tagsAlteradas = output<TagResumoDto[]>();

  private readonly idsSelecionados = computed(() => new Set(this.tags().map((tag) => tag.id)));

  selecionada(tag: TagResumoDto): boolean {
    return this.idsSelecionados().has(tag.id);
  }

  alternar(tag: TagResumoDto): void {
    const anteriores = this.tags();
    const jaTem = this.selecionada(tag);
    // Mantém a ordem do catálogo (mesma ordem do popover) em vez da ordem de clique.
    const proximo = this.tagsDisponiveis().filter((disponivel) =>
      disponivel.id === tag.id ? !jaTem : this.idsSelecionados().has(disponivel.id),
    );
    this.tags.set(proximo);

    this.demandaService.alterarTags(this.demandaId(), { tagIds: proximo.map((item) => item.id) }).subscribe({
      next: () => this.tagsAlteradas.emit(proximo),
      error: () => this.tags.set(anteriores),
    });
  }
}
