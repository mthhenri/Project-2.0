import { Component, computed, inject, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadePrioridadeResumoDto } from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';

/**
 * A prioridade da atividade como uma bolinha na cor dela, para o modo dividido da listagem (task 288), onde o selo com o nome não cabe.
 * O nome fica no tooltip. Editável, é um botão que pede o seletor de prioridade; senão, só mostra. A cor é a do cache do
 * `AtividadePrioridadeService`, se houver (a troca do administrador vale em todas as telas), como no `app-prioridade-selo`.
 */
@Component({
  selector: 'app-atividade-prioridade-bolinha',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './atividade-prioridade-bolinha.component.html',
  styleUrl: './atividade-prioridade-bolinha.component.scss',
})
export class AtividadePrioridadeBolinhaComponent {
  private readonly prioridadeService = inject(AtividadePrioridadeService);

  readonly prioridade = input.required<Pick<AtividadePrioridadeResumoDto, 'codigo' | 'descricao' | 'cor'>>();
  readonly editavel = input<boolean>(false);
  /** Clicou na bolinha editável: a hospedeira abre o seletor ancorado no evento. */
  readonly trocar = output<Event>();

  readonly cor = computed(() => {
    const codigo = this.prioridade().codigo;
    return this.prioridadeService.prioridades().find((item) => item.codigo === codigo)?.cor ?? this.prioridade().cor;
  });
  readonly dica = computed(() => `Prioridade ${this.prioridade().descricao}${this.editavel() ? ' (trocar)' : ''}`);
}
