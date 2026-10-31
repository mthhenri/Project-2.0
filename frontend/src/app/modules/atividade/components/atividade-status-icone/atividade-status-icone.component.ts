import { Component, computed, input } from '@angular/core';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { visualStatusAtividade } from '../../models/atividade.model';

/**
 * O status da atividade como quadradinho de checklist (task 288), só para o modo dividido da listagem, onde o nome do status não cabe.
 * Planejada: tracejado; Pendente: traço; Desenvolvendo: play; Desenvolvida: preenchido com check. A cor vem do mapa do modelo.
 */
@Component({
  selector: 'app-atividade-status-icone',
  standalone: true,
  templateUrl: './atividade-status-icone.component.html',
  styleUrl: './atividade-status-icone.component.scss',
})
export class AtividadeStatusIconeComponent {
  readonly status = input.required<TipoAtividadeStatusEnum>();
  readonly visual = computed(() => visualStatusAtividade(this.status()));
}
