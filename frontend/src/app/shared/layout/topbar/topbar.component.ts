import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { usuarioAutenticado } from '../../../core/signals/usuario-autenticado.signal';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly usuario = usuarioAutenticado;

  sair(): void {
    localStorage.removeItem('token');
    usuarioAutenticado.set(null);
  }
}
