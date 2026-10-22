import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { iniciais } from '../../utils/mensagem-direta.util';

/** O círculo com as iniciais da pessoa e, se `online` for informado, a bolinha de presença (verde online, cinza offline). */
@Component({
  selector: 'app-mensagem-direta-avatar',
  standalone: true,
  templateUrl: './mensagem-direta-avatar.component.html',
  styleUrl: './mensagem-direta-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaAvatarComponent {
  readonly nome = input.required<string>();
  /** `null` não mostra a bolinha. */
  readonly online = input<boolean | null>(null);
  readonly pequeno = input(false);

  readonly iniciais = computed(() => iniciais(this.nome()));
}
