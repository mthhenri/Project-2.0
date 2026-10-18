import { Component, computed, inject, input } from '@angular/core';
import { AtividadePrioridadeResumoDto } from '@project20/shared';
import { AtividadePrioridadeService } from '../../../core/services/atividade-prioridade.service';

/**
 * Selo da prioridade da atividade (task 143): ponto e nome na cor da prioridade, com fundo e borda suaves (legível nos temas claro e
 * escuro). A cor mostrada é a do cache do `AtividadePrioridadeService`, se houver, para que a troca feita pelo administrador valha em
 * todas as telas abertas; sem cache, usa a que veio com a atividade.
 */
@Component({
  selector: 'app-prioridade-selo',
  standalone: true,
  templateUrl: './prioridade-selo.component.html',
  styleUrl: './prioridade-selo.component.scss',
})
export class PrioridadeSeloComponent {
  private readonly prioridadeService = inject(AtividadePrioridadeService);

  readonly prioridade = input.required<Pick<AtividadePrioridadeResumoDto, 'codigo' | 'descricao' | 'cor'>>();
  /** Cor de pré-visualização (a tela de Configurações mostra o selo com a cor ainda não salva). */
  readonly corForcada = input<string | null>(null);

  readonly cor = computed(() => {
    const forcada = this.corForcada();
    if (forcada) return forcada;
    const codigo = this.prioridade().codigo;
    return this.prioridadeService.prioridades().find((item) => item.codigo === codigo)?.cor ?? this.prioridade().cor;
  });
}
