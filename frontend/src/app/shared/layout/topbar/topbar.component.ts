import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { usuarioAutenticado } from '../../../core/signals/usuario-autenticado.signal';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, ButtonModule],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  private readonly autenticacaoService = inject(AutenticacaoService);
  readonly usuario = usuarioAutenticado;

  sair(): void {
    this.autenticacaoService.logout();
  }
}
