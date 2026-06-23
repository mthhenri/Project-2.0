import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaPersonalizadoService } from './core/services/tema-personalizado.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  // Instanciado no startup para aplicar a cor primária salva cedo e ativar a
  // reconciliação da preferência quando a sessão muda de usuário.
  private readonly temaPersonalizado = inject(TemaPersonalizadoService);
}
