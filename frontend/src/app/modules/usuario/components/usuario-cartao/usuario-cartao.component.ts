import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UsuarioResumoDto } from '@project20/shared';
import { iniciaisDoNome } from '../../utils/usuario-credenciais.util';

/** Identidade do usuário numa linha: avatar de iniciais + nome + login (task 113). */
@Component({
  selector: 'app-usuario-cartao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuario-cartao.component.html',
  styleUrl: './usuario-cartao.component.scss',
})
export class UsuarioCartaoComponent {
  readonly usuario = input.required<Pick<UsuarioResumoDto, 'nomeCompleto' | 'login'>>();
  readonly iniciais = computed(() => iniciaisDoNome(this.usuario().nomeCompleto));
}
